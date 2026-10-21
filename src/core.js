/* Key Lime — native EffectCraft keyframe tools. No external dependencies. */
var KeyLime = (function () {
    var K = {}, EPS = 0.000001;
    K.version = '1.0.1';
    K.colors = [[0.85,0.9,0.81,1],[0.43,0.76,0.96,1],[0.97,0.63,0.42,1],[0.8,0.55,0.94,1],[0.36,0.83,0.7,1],[0.97,0.79,0.35,1],[0.96,0.49,0.62,1],[0.64,0.69,0.98,1]];
    K.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
    K.clone = function (v) { return JSON.parse(JSON.stringify(v)); };
    K.layer = function (p) { return p.propertyGroup(p.propertyDepth); };
    K.batch = function (steps, label) {
        if (!steps.length) return;
        var before=app.project.__info().revision, failure=null, name='Key Lime · '+label;
        app.beginUndoGroup(name);
        try { for(var i=0;i<steps.length;i++)app.run(steps[i].command,steps[i].params); }
        catch(e) { failure=e; }
        finally { app.endUndoGroup(); }
        if(failure){
            var undo=app.run('project.summary',{}).undo||[];
            if(app.project.__info().revision!==before&&undo[undo.length-1]===name)app.run('edit.undo',{});
            throw failure;
        }
    };
    function nodeByUid(group, uid) {
        for (var i=1; i<=group.numProperties; i++) {
            var p=group.property(i);
            if (p.__uid===uid) return p;
            if (p.propertyType!==PropertyType.PROPERTY) { var found=nodeByUid(p,uid); if(found)return found; }
        }
        return null;
    }
    K.property = function (ref) {
        // IDs survive renaming/reordering. Search other comps after precomposition.
        var c=app.project.itemByID(ref.comp), l=null, i;
        if(c instanceof CompItem)for(i=1;i<=c.numLayers;i++)if(c.layer(i).id===ref.layer){l=c.layer(i);break;}
        if(!l)for(var j=1;j<=app.project.numItems&&!l;j++){
            var candidate=app.project.item(j);if(!(candidate instanceof CompItem))continue;
            for(i=1;i<=candidate.numLayers;i++)if(candidate.layer(i).id===ref.layer){c=candidate;l=c.layer(i);break;}
        }
        if(!l)throw new Error('The stashed layer is missing. Clear this Key slot.');
        var p=nodeByUid(l,ref.uid);
        if(!p||p.propertyType!==PropertyType.PROPERTY)throw new Error('The stashed property is missing. Clear this Key slot.');
        return {comp:c,layer:l,prop:p};
    };
    function reference(p, indices) {
        var l=K.layer(p), raw=p.__keys(), keys=[];
        for(var i=0;i<indices.length;i++){
            var k=raw[indices[i]-1];
            keys.push({time:k.layerTime, value:K.clone(k.value)});
        }
        return {comp:l.containingComp.id,layer:l.id,uid:p.__uid,keys:keys};
    }
    K.capture = function () {
        var c=app.project.activeItem, refs=[];
        if(!(c instanceof CompItem))throw new Error('Open a composition and select keyframes.');
        var props=c.selectedProperties, unsupported=0;
        for(var i=0;i<props.length;i++){
            var p=props[i];if(p.propertyType!==PropertyType.PROPERTY||!p.numKeys)continue;
            var keys=p.selectedKeys;if(!keys.length)continue;
            if(!p.isInterpolationTypeValid(KeyframeInterpolationType.BEZIER)){unsupported++;continue;}
            refs.push(reference(p,keys));
        }
        if(refs.length>8)throw new Error('Select up to 8 properties at a time.');
        if(!refs.length)throw new Error(unsupported?'Not supported: this property cannot ease.':'Select keyframes, then move over Key Lime.');
        if(unsupported)throw new Error('The selection includes a property that cannot ease.');
        return refs;
    };
    K.signature = function (refs) {
        return refs.map(function(r){return r.comp+':'+r.layer+':'+r.uid+':'+r.keys.map(function(k){return k.time;}).join(',');}).join('|');
    };
    K.resolve = function (refs) {
        if(!refs||!refs.length)throw new Error('Select or recall keyframes first.');
        var tracks=[];
        for(var i=0;i<refs.length;i++){
            var r=refs[i], o=K.property(r), raw=o.prop.__keys(), keys=[], used={};
            for(var j=0;j<r.keys.length;j++){
                var saved=r.keys[j], found=-1;
                for(var n=0;n<raw.length;n++)if(Math.abs(raw[n].layerTime-saved.time)<EPS){found=n;break;}
                // A moved key can be recovered only by an unambiguous value match.
                if(found<0){var matches=[];for(n=0;n<raw.length;n++)if(JSON.stringify(raw[n].value)===JSON.stringify(saved.value))matches.push(n);if(matches.length===1)found=matches[0];}
                if(found<0||used[found])throw new Error('A stashed key is missing or ambiguous. Clear and stash this selection again.');
                used[found]=true;keys.push(found+1);
            }
            keys.sort(function(a,b){return a-b;});
            o.keys=keys;o.raw=raw;o.ref=r;tracks.push(o);
        }
        return tracks;
    };
    K.recapture = function (tracks) { return tracks.map(function(t){return reference(t.prop,t.keys);}); };
    K.select = function (refs) {
        var tracks=K.resolve(refs), c=tracks[0].comp, layers=[], props=[], keys=[];
        for(var i=0;i<tracks.length;i++){
            var t=tracks[i];if(t.comp.id!==c.id)throw new Error('Reveal these properties from their individual compositions.');
            if(layers.indexOf(t.layer.id)<0)layers.push(t.layer.id);
            props.push({layer:t.layer.id,prop:t.prop.__uid});
            for(var j=0;j<t.keys.length;j++)keys.push({layer:t.layer.id,prop:t.prop.__uid,time:t.raw[t.keys[j]-1].layerTime});
        }
        c.openInViewer();
        app.run('layer.select',{comp:c.id,layers:layers});
        // Selecting keys also selects their properties in EffectCraft.
        app.run('keys.select',{comp:c.id,keys:keys});
        app.run('anim.reveal',{kind:'keyframes'});
        return tracks;
    };
    function pathLength(a, ta, tb, b) {
        var prev=a, total=0;
        for(var s=1;s<=96;s++){
            var t=s/96,u=1-t,pt=[],sq=0;
            for(var d=0;d<a.length;d++){pt[d]=u*u*u*a[d]+3*u*u*t*(a[d]+(ta[d]||0))+3*u*t*t*(b[d]+(tb[d]||0))+t*t*t*b[d];sq+=(pt[d]-prev[d])*(pt[d]-prev[d]);}
            total+=Math.sqrt(sq);prev=pt;
        }return total;
    }
    K.slopes = function (track, left) {
        var a=track.raw[left-1], b=track.raw[left];if(!a||!b)return null;
        var dt=b.layerTime-a.layerTime;if(!(dt>EPS))return null;
        var n=a.outEase.length, s=[], vt=track.prop.propertyValueType;
        if(vt===PropertyValueType.TwoD_SPATIAL||vt===PropertyValueType.ThreeD_SPATIAL){
            var len=pathLength(a.value,a.spatialOut,b.spatialIn,b.value);for(var d=0;d<n;d++)s.push(len/dt);
        }else if(typeof a.value==='number')s.push((b.value-a.value)/dt);
        else if(a.value instanceof Array)for(var e=0;e<n;e++)s.push(((b.value[e]||0)-(a.value[e]||0))/dt);
        else for(var f=0;f<n;f++)s.push(1/dt);
        return s;
    };
    function params(t,k) {return {comp:t.comp.id,__keys:[{layer:t.layer.id,prop:t.prop.__uid,index:k-1}]};}
    function add(steps,command,p,extra){for(var x in extra)if(extra.hasOwnProperty(x))p[x]=extra[x];steps.push({command:command,params:p});}
    function editable(t,k){if(t.layer.locked)throw new Error('Unlock '+t.layer.name+' before editing its keys.');return !t.raw[k-1].roving;}
    K.edit = function (refs, change) {
        if(change.influence!==undefined&&(!isFinite(change.influence)||typeof change.influence!=='number'))throw new Error('Influence must be a number.');
        if(change.speed!==undefined&&(!isFinite(change.speed)||typeof change.speed!=='number'))throw new Error('Speed must be a number.');
        var tracks=K.resolve(refs),steps=[],changed=0,skipped=0;
        for(var i=0;i<tracks.length;i++){
            var t=tracks[i];
            for(var j=0;j<t.keys.length;j++){
                if(change.ordinal!==undefined&&change.ordinal!==j)continue;
                var k=t.keys[j], key=t.raw[k-1];
                if(!editable(t,k)){skipped++;continue;}
                var before=steps.length, incoming=K.clone(key.inEase), outgoing=K.clone(key.outEase), inType=key.inInterp,outType=key.outInterp;
                var sides=change.side||'both';
                if(change.mode==='linear'||change.mode==='hold'){
                    add(steps,'keys.interpolation',params(t,k),{'in':change.mode==='hold'?'HOLD':'LINEAR',out:change.mode==='hold'?'HOLD':'LINEAR',autoBezier:false,continuous:false});
                }else{
                    var doIn=sides!=='out'&&k>1,doOut=sides!=='in'&&k<t.raw.length;
                    var editSide=function(eases,slope,isOut){
                        if(!slope)return;
                        for(var d=0;d<eases.length;d++){
                            if(change.influence!==undefined)eases[d].influence=K.clamp(change.influence,0.1,100);
                            if(change.speed!==undefined)eases[d].speed=change.speed*(slope[d]||0);
                            if(change.mode==='ease'){eases[d].speed=0;eases[d].influence=33.333333;}
                        }
                    };
                    if(doIn){editSide(incoming,K.slopes(t,k-1),false);inType='BEZIER';}
                    if(doOut){editSide(outgoing,K.slopes(t,k),true);outType='BEZIER';}
                    if(doIn||doOut){
                        add(steps,'keys.velocity',params(t,k),{inSpeed:incoming.map(function(e){return e.speed;}),inInfluence:incoming.map(function(e){return e.influence;}),outSpeed:outgoing.map(function(e){return e.speed;}),outInfluence:outgoing.map(function(e){return e.influence;})});
                        add(steps,'keys.interpolation',params(t,k),{'in':inType,out:outType,autoBezier:false,continuous:false});
                    }
                }
                if(steps.length>before)changed++;
            }
        }
        K.batch(steps,change.label||'Edit easing');return {changed:changed,skipped:skipped};
    };
    K.scrub = function (refs, ordinal, side, value, speed, merge) {
        var tracks=K.resolve(refs), commands=[], count=0, skipped=0;
        for(var i=0;i<tracks.length;i++){
            var t=tracks[i];
            for(var j=0;j<t.keys.length;j++){
                if(ordinal!==null&&j!==ordinal)continue;
                var k=t.keys[j];if(!editable(t,k)){skipped++;continue;}
                var key=t.raw[k-1],p=params(t,k);p.merge=merge;p.continuous=false;var changed=false;
                // Materialize the effective speeds before the host disables Auto Bezier.
                // Influence-only velocity commands otherwise reuse stale stored values,
                // or initialize Position with a signed component instead of path speed.
                function preserve(out){
                    var ease=out?key.outEase:key.inEase;
                    p[out?'outSpeed':'inSpeed']=ease.map(function(e){return e.speed;});
                    p[out?'outInfluence':'inInfluence']=ease.map(function(e){return e.influence;});
                }
                if(key.autoBezier){
                    if(key.inInterp==='BEZIER')preserve(false);
                    if(key.outInterp==='BEZIER')preserve(true);
                }
                for(var s=0;s<2;s++){
                    var out=s===1;if(side==='in'&&out||side==='out'&&!out)continue;
                    var slopes=K.slopes(t,out?k:k-1);if(!slopes)continue;
                    preserve(out);
                    if(speed)p[out?'outSpeed':'inSpeed']=slopes.map(function(v){return v*value;});
                    else p[out?'outInfluence':'inInfluence']=K.clamp(value,0.1,100);
                    changed=true;
                }
                if(changed){commands.push(p);count++;}
            }
        }
        // A unique gesture merge key folds every movement into one Undo entry.
        // All targets and values are validated before the first command.
        for(i=0;i<commands.length;i++)app.run('keys.velocity',commands[i]);
        return {changed:count,skipped:skipped};
    };
    K.stashEase = function (refs) {
        var tracks=K.resolve(refs),t=tracks[0],entries=[];
        for(var j=0;j<t.keys.length;j++){
            var k=t.keys[j],key=t.raw[k-1];
            var normalize=function(eases,s){return eases.map(function(e,d){if(s&&Math.abs(s[d]||0)<=EPS&&Math.abs(e.speed)>EPS)throw new Error('Cannot normalize a nonzero speed between equal values. Store a segment whose value changes.');return {influence:e.influence,speed:s&&Math.abs(s[d]||0)>EPS?e.speed/s[d]:0};});};
            entries.push({incoming:normalize(key.inEase,K.slopes(t,k-1)),outgoing:normalize(key.outEase,K.slopes(t,k)),inType:key.inInterp,outType:key.outInterp});
        }
        return {version:1,keys:entries};
    };
    K.validEase = function (preset) {
        if(!preset||preset.version!==1||!(preset.keys instanceof Array)||!preset.keys.length||preset.keys.length>4096)return false;
        for(var i=0;i<preset.keys.length;i++){
            var k=preset.keys[i];if(!k||['LINEAR','BEZIER','HOLD'].indexOf(k.inType)<0||['LINEAR','BEZIER','HOLD'].indexOf(k.outType)<0)return false;
            for(var s=0;s<2;s++){
                var a=s?k.outgoing:k.incoming;if(!(a instanceof Array)||!a.length||a.length>4)return false;
                for(var j=0;j<a.length;j++)if(!isFinite(a[j].speed)||typeof a[j].speed!=='number'||typeof a[j].influence!=='number'||a[j].influence<0.1||a[j].influence>100)return false;
            }
        }return true;
    };
    K.pasteEase = function (refs,preset,reverse) {
        if(!K.validEase(preset))throw new Error('Store an ease in this slot first.');
        var tracks=K.resolve(refs),entries=K.clone(preset.keys),steps=[],count=0,skipped=0;
        if(reverse)entries.reverse();
        for(var i=0;i<tracks.length;i++){
            var t=tracks[i];
            for(var j=0;j<t.keys.length;j++){
                var k=t.keys[j];if(!editable(t,k)){skipped++;continue;}
                // Equal counts reproduce every key. Other counts repeat the stored segment.
                var e=entries.length===t.keys.length?entries[j]:null;
                var inSource=e?(reverse?e.outgoing:e.incoming):(reverse?entries[entries.length-1].outgoing:entries[entries.length-1].incoming);
                var outSource=e?(reverse?e.incoming:e.outgoing):(reverse?entries[0].incoming:entries[0].outgoing);
                var inType=e?(reverse?e.outType:e.inType):(reverse?entries[entries.length-1].outType:entries[entries.length-1].inType);
                var outType=e?(reverse?e.inType:e.outType):(reverse?entries[0].inType:entries[0].outType);
                var current=t.raw[k-1],inc=K.clone(current.inEase),out=K.clone(current.outEase);
                function fit(dest,src,slope){if(!slope)return;for(var d=0;d<dest.length;d++){var se=src[d]||src[0];dest[d]={speed:se.speed*(slope[d]||0),influence:se.influence};}}
                if(k>1)fit(inc,inSource,K.slopes(t,k-1));else inType=current.inInterp;
                if(k<t.raw.length)fit(out,outSource,K.slopes(t,k));else outType=current.outInterp;
                add(steps,'keys.velocity',params(t,k),{inSpeed:inc.map(function(e){return e.speed;}),inInfluence:inc.map(function(e){return e.influence;}),outSpeed:out.map(function(e){return e.speed;}),outInfluence:out.map(function(e){return e.influence;})});
                add(steps,'keys.interpolation',params(t,k),{'in':inType,out:outType,autoBezier:false,continuous:false});count++;
            }
        }
        K.batch(steps,reverse?'Paste reversed ease':'Paste ease');return {changed:count,skipped:skipped};
    };
    K.nudge = function (refs, frames) {
        var tracks=K.resolve(refs),steps=[];
        for(var i=0;i<tracks.length;i++){
            var t=tracks[i],delta=frames/t.comp.frameRate*100/t.layer.stretch;
            if(t.layer.locked)throw new Error('Unlock '+t.layer.name+' before moving keys.');
            for(var j=0;j<t.keys.length;j++){
                var index=t.keys[j]-1,k=t.raw[index],dest=k.layerTime+delta;
                if(k.roving)throw new Error('Turn off Roving before nudging this selection.');
                // Reject crossing an unselected neighbour. The host clamps crossed keys.
                for(var n=0;n<t.raw.length;n++)if(t.keys.indexOf(n+1)<0){var time=t.raw[n].layerTime;if((time-k.layerTime)*(time-dest)<=EPS*EPS)throw new Error('Nudge would cross or overwrite an unselected key.');}
            }
            var ordered=t.keys.slice().sort(function(a,b){return delta>0?b-a:a-b;});
            for(j=0;j<ordered.length;j++){
                var raw=t.raw[ordered[j]-1];
                steps.push({command:'keys.set',params:{comp:t.comp.id,layer:t.layer.id,prop:t.prop.__uid,time:raw.layerTime,newTime:raw.layerTime+delta,timeBase:'layer'}});
            }
        }
        K.batch(steps,'Nudge '+frames+' frame'+(Math.abs(frames)===1?'':'s'));
        // Refresh the saved addresses only after the entire operation succeeded.
        for(i=0;i<tracks.length;i++){
            t=tracks[i];var d=frames/t.comp.frameRate*100/t.layer.stretch;
            for(j=0;j<t.ref.keys.length;j++)t.ref.keys[j].time=t.raw[t.keys[j]-1].layerTime+d;
        }
        return K.resolve(refs);
    };
    // Sample the cubic's derivative in time: a speed graph, not a value curve.
    K.segment = function (t,left) {
        var a=t.raw[left-1],b=t.raw[left],sl=K.slopes(t,left);if(!a||!b||!sl)return [];
        var dim=0;function weight(d){return Math.max(Math.abs(sl[d]||0),Math.abs((a.outEase[d]||a.outEase[0]).speed),Math.abs((b.inEase[d]||b.inEase[0]).speed));}for(var d=1;d<sl.length;d++)if(weight(d)>weight(dim))dim=d;
        var avg=sl[dim], oe=a.outEase[dim]||a.outEase[0],ie=b.inEase[dim]||b.inEase[0];
        if(a.outInterp==='HOLD')return [[a.time,0],[b.time,0]];
        var oi=a.outInterp==='LINEAR'?1/3:oe.influence/100, ii=b.inInterp==='LINEAR'?1/3:ie.influence/100;
        var os=a.outInterp==='LINEAR'?avg:oe.speed,ins=b.inInterp==='LINEAR'?avg:ie.speed;
        // EffectCraft retains crossing handles, including influence sums over 100%.
        // Work in value-units per second, so equal endpoint values can still overshoot.
        var x1=oi,x2=1-ii,y1=os*oi,y2=avg-ins*ii,out=[];
        for(var s=0;s<=96;s++){
            var q=s/96,u=1-q,x=3*u*u*q*x1+3*u*q*q*x2+q*q*q;
            var dx=3*u*u*x1+6*u*q*(x2-x1)+3*q*q*(1-x2),dy=3*u*u*y1+6*u*q*(y2-y1)+3*q*q*(avg-y2);
            var speed=Math.abs(dy/Math.max(dx,EPS));
            out.push([a.time+x*(b.time-a.time),speed]);
        }return out;
    };
    K.graph = function (tracks) {
        var graphs=[],lo=Infinity,hi=-Infinity,max=0;
        for(var i=0;i<tracks.length;i++){
            var t=tracks[i],a=t.keys[0],b=t.keys[t.keys.length-1];
            if(a===b){if(a>1)a--;else if(b<t.raw.length)b++;}
            var segments=[];
            for(var k=a;k<b;k++){
                var points=K.segment(t,k);segments.push(points);
                for(var j=0;j<points.length;j++)max=Math.max(max,points[j][1]);
            }
            lo=Math.min(lo,t.raw[a-1].time);hi=Math.max(hi,t.raw[b-1].time);
            graphs.push({segments:segments,track:t});
        }return {graphs:graphs,min:lo,max:hi,peak:max||1};
    };
    return K;
})();
