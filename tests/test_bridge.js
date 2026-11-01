const fs=require('fs'),vm=require('vm'),assert=require('assert');
function box(name,unread,children=[]) {
 let remaining=unread;
 const filtered=()=>Array(remaining).fill({});
 Object.defineProperty(filtered,'readStatus',{set(v){assert.equal(v,true);remaining=0;}});
 const messages=[];messages.whose=()=>filtered;
 const mailboxes=()=>children;
 return {name:()=>name,messages,mailboxes};
}
const child=box('Nested',2), inbox=box('Inbox',3,[child]);
const boxes=()=>[inbox];boxes.whose=()=>()=>[inbox];
const acct={name:()=> 'Test',mailboxes:boxes};
const accounts=()=>[acct];accounts.whose=()=>()=>[acct];
const context={Application:()=>({accounts})};vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/../bridge.js','utf8'),context);
let run=p=>JSON.parse(context.run([JSON.stringify(p)]));
assert.equal(run({action:'unread_counts'}).remaining_unread_occurrences,5);
let result=run({action:'mark_all_read'});
assert.equal(result.mailboxes.length,2);assert.equal(result.remaining_unread_occurrences,0);assert(result.complete);
assert.equal(run({action:'unread_counts'}).remaining_unread_occurrences,0);
console.log('Bulk scope, recursion, mutation and verification passed (simulated Mail).');
