function run(argv) {
    const p = JSON.parse(argv[0]), app = Application('Mail');
    const limit = p.limit || 20;
    function account() {
        const xs = app.accounts.whose({name: p.account})();
        if (xs.length !== 1) throw Error('Account not found or ambiguous');
        return xs[0];
    }
    function box(path) {
        let parent = account();
        for (const name of path) {
            const xs = parent.mailboxes.whose({name: name})();
            if (xs.length !== 1) throw Error('Mailbox not found or ambiguous: ' + name);
            parent = xs[0];
        }
        return parent;
    }
    function message() {
        const xs = box(p.mailbox).messages.whose({id: p.id})();
        if (xs.length !== 1) throw Error('Message no longer exists at this location; search again');
        return xs[0];
    }
    function summary(m, body) {
        const b = m.mailbox();
        const candidates = [];
        function locate(parent, prefix) {
            for (const child of parent.mailboxes()) {
                const next=prefix.concat([child.name()]);
                if(child.name()===b.name()) candidates.push(next);
                if(next.length<20) locate(child,next);
            }
        }
        locate(b.account(),[]);
        let path = null;
        if(candidates.length===1) path=candidates[0];
        else for(const candidate of candidates) {
            let parent=b.account();
            for(const name of candidate) parent=parent.mailboxes.whose({name:name})()[0];
            if(parent.messages.whose({id:m.id()})().length===1) {path=candidate;break;}
        }
        if(!path) throw Error('Could not resolve actual mailbox path');
        const result = {id:m.id(), account:b.account().name(), subject:m.subject(), sender:m.sender(),
            date_received:String(m.dateReceived()), read:m.readStatus(), flagged:m.flaggedStatus(),
            mailbox:path};
        if (body) result.content = m.content().slice(0, p.max_chars || 12000);
        return result;
    }
    let result;
    switch (p.action) {
    case 'accounts':
        result = app.accounts().map(a => ({name:a.name(), emails:a.emailAddresses(), enabled:a.enabled()})); break;
    case 'mailboxes': {
        const out = [];
        function walk(parent, path) {
            for (const b of parent.mailboxes()) {
                const next = path.concat([b.name()]);
                out.push({path:next});
                if (next.length < 20) walk(b, next);
            }
        }
        walk(account(), []); result = out; break;
    }
    case 'selection':
        result = app.selection().slice(0,limit).map(m => summary(m,true)); break;
    case 'search': {
        const b = box(p.mailbox), count = b.messages.length;
        const scanned = Math.min(count,p.scan_limit || 500), out = [];
        for (let i=0;i<scanned;i++) {
            const m=b.messages[i];
            if (p.unread_only && m.readStatus()) continue;
            if (p.subject && !m.subject().toLowerCase().includes(p.subject.toLowerCase())) continue;
            if (p.sender && !m.sender().toLowerCase().includes(p.sender.toLowerCase())) continue;
            out.push(summary(m,false));
            if (out.length >= limit) break;
        }
        result={messages:out,mailbox_count:count,scan_limit:scanned,
            possibly_more:count>scanned || out.length>=limit}; break;
    }
    case 'read': result=summary(message(),true); break;
    case 'update': {
        const m=message();
        if (p.read !== undefined) m.readStatus=p.read;
        if (p.flagged !== undefined) m.flaggedStatus=p.flagged;
        result=summary(m,false); break;
    }
    case 'move': {
        const m=message(), target=box(p.destination);
        app.move(m,{to:target}); result={moved:true,destination:p.destination}; break;
    }
    case 'draft': {
        const m=app.OutgoingMessage({subject:p.subject,content:p.body,visible:true,sender:p.sender});
        app.outgoingMessages.push(m);
        for (const address of p.to) m.toRecipients.push(app.ToRecipient({address:address}));
        app.save(m); result={draft_id:m.id(),saved:true}; break;
    }
    case 'send': {
        const xs=app.outgoingMessages.whose({id:p.draft_id})();
        if(xs.length!==1) throw Error('Draft is not open; open it in Mail first');
        result={submitted:app.send(xs[0])}; break;
    }
    default: throw Error('Unknown action');
    }
    return JSON.stringify(result);
}
