(function(thisObj){
    var K=KeyLime,ui=thisObj instanceof Panel?thisObj:new Window('palette','Key Lime',undefined,{resizeable:true});
    ui.orientation='column';ui.alignChildren=['fill','top'];ui.margins=10;ui.spacing=6;ui.preferredSize=[320,510];
    var C={bg:[.115,.12,.115,1],well:[.065,.07,.065,1],border:[.25,.28,.23,1],muted:[.50,.54,.48,1],text:[.82,.85,.79,1],lime:[.67,.83,.33,1],selected:[.23,.30,.12,1],key:[.33,.67,.88,1],ease:[.9,.71,.25,1]};
    var refs=null,tracks=[],model=null,keySlots=[null,null,null,null],easeSlots=[null,null,null,null],activeKey=-1,activeEase=-1,lastSelection='',busy=false,gesture=null,serial=0,page=0,lastHover=0,invalid=false;
    var priorPath=app.project.file?app.project.file.fsName:null,hadHistory=false;
    try{var stored=JSON.parse(app.settings.getSetting('Key Lime','easeSlots'));for(var i=0;i<4;i++)if(K.validEase(stored[i]))easeSlots[i]=stored[i];}catch(ignore){}
    function size(c){return [c.size.width||c.size[0],c.size.height||c.size[1]];}
    function rgb(c){return [0,1,2].map(function(i){return c[i]<=.04045?c[i]/12.92:Math.pow((c[i]+.055)/1.055,2.4);}).concat([c.length>3?c[3]:1]);}
    function pen(g,c,w){return g.newPen(g.PenType.SOLID_COLOR,rgb(c),w||1);}
    function brush(g,c){return g.newBrush(g.BrushType.SOLID_COLOR,rgb(c));}
    function rect(g,x,y,w,h,c){g.newPath();g.rectPath(x,y,w,h);g.fillPath(brush(g,c));}
    function line(g,x,y,xx,yy,c,w){g.newPath();g.moveTo(x,y);g.lineTo(xx,yy);g.strokePath(pen(g,c,w));}
    function round(g,x,y,w,h,r){
        r=Math.min(r,w/2,h/2);g.newPath();var centers=[[x+w-r,y+r],[x+w-r,y+h-r],[x+r,y+h-r],[x+r,y+r]];
        for(var c=0;c<4;c++)for(var s=0;s<=6;s++){var a=(-90+c*90+s*15)*Math.PI/180,px=centers[c][0]+Math.cos(a)*r,py=centers[c][1]+Math.sin(a)*r;if(c===0&&s===0)g.moveTo(px,py);else g.lineTo(px,py);}g.closePath();
    }
    function box(g,x,y,w,h,fill,stroke,r){round(g,x,y,w,h,r===undefined?7:r);if(fill)g.fillPath(brush(g,fill));if(stroke)g.strokePath(pen(g,stroke,1));}
    function text(g,str,x,y,color,fs){g.drawString(String(str),pen(g,color||C.text),x,y,ScriptUI.newFont('dialog','REGULAR',fs||12));}
    function circle(g,x,y,r,color){g.newPath();g.ellipsePath(x-r,y-r,r*2,r*2);g.fillPath(brush(g,color));}
    function poly(g,pts,color,fill){g.newPath();for(var i=0;i<pts.length;i++)if(i)g.lineTo(pts[i][0],pts[i][1]);else g.moveTo(pts[i][0],pts[i][1]);if(fill){g.closePath();g.fillPath(brush(g,color));}else g.strokePath(pen(g,color,1.5));}
    function icon(g,id,x,y,c){
        function p(a,fill){poly(g,a.map(function(q){return [x+q[0],y+q[1]];}),c,fill);}
        if(id==='linear')p([[0,-6],[6,0],[0,6],[-6,0]],true);
        else if(id==='ease')p([[-6,-6],[6,-6],[2,0],[6,6],[-6,6],[-2,0]],true);
        else if(id==='out')p([[-6,-6],[0,-6],[6,0],[0,6],[-6,6],[-2,0]],true);
        else if(id==='in')p([[6,-6],[0,-6],[-6,0],[0,6],[6,6],[2,0]],true);
        else if(id==='hold')p([[-6,0],[0,-6],[6,-6],[6,6],[0,6]],true);
        else if(id==='left'||id==='right'){var d=id==='left'?1:-1;p([[d*6,-3],[0,-3],[0,-7],[-d*7,0],[0,7],[0,3],[d*6,3]],true);}
        else if(id==='bookmark')p([[-5,-7],[5,-7],[5,7],[0,3],[-5,7]],true);
        else if(id==='eye'){p([[-8,0],[-4,-4],[0,-5],[4,-4],[8,0],[4,4],[0,5],[-4,4],[-8,0]],false);circle(g,x,y,2,c);}
        else if(id==='trash'){p([[-4,-3],[-3,7],[3,7],[4,-3]],false);p([[-6,-5],[6,-5]],false);p([[-2,-7],[2,-7]],false);p([[-1,-2],[-1,4]],false);p([[2,-2],[2,4]],false);}
        else if(id==='copy'){p([[-5,-6],[3,-6],[3,5],[-5,5],[-5,-6]],false);p([[5,-3],[5,7],[-2,7]],false);p([[-3,-3],[1,-3]],false);p([[-3,0],[1,0]],false);}
        else if(id==='paste'){p([[-5,-5],[-2,-5],[-2,-7],[2,-7],[2,-5],[5,-5],[5,7],[-5,7],[-5,-5]],false);p([[-2,-5],[2,-5]],false);}
        else if(id==='menu'){for(var n=-1;n<=1;n++)line(g,x-5,y+n*4,x+5,y+n*4,c,1.4);}
        else if(id==='lime'){circle(g,x,y,7,c);circle(g,x,y,5,C.bg);for(var a=0;a<6;a++){var ang=a*Math.PI/3;line(g,x,y,x+4*Math.cos(ang),y+4*Math.sin(ang),c,1);}circle(g,x,y,1,c);}
    }
    function row(parent){var r=parent.add('group');r.orientation='row';r.alignChildren=['fill','center'];r.spacing=5;return r;}
    function msg(s){status.text=s;}
    function act(fn){try{checkProject();fn();}catch(e){msg(e.message||String(e));}}
    function btn(parent,id,title,draw,action,w,h){
        var b=parent.add('button',undefined,title,{name:id});b.preferredSize=[w||28,h||28];b.alignment=['fill','center'];b.helpTip=title;
        b.onDraw=function(){var g=this.graphics,s=size(this);box(g,1,1,s[0]-2,s[1]-2,this.active?C.selected:C.bg,this.active?C.lime:C.border,9);if(draw)icon(g,draw,s[0]/2,s[1]/2,this.active?C.lime:C.text);else{var tw=g.measureString(this.text)[0];text(g,this.text,(s[0]-tw)/2,(s[1]-15)/2,this.active?C.lime:C.text);}};
        b.addEventListener('mousedown',function(e){b.modifiers={shiftKey:e.shiftKey,altKey:e.altKey,ctrlKey:e.ctrlKey,metaKey:e.metaKey};});
        b.onClick=function(){var mods=b.modifiers||ScriptUI.environment.keyboardState;b.modifiers=null;act(function(){action(mods);});};return b;
    }
    ui.onDraw=function(){var s=size(this);rect(this.graphics,0,0,s[0],s[1],C.bg);};
    var header=row(ui),brand=header.add('group',undefined,undefined,{name:'brand'});brand.preferredSize=[210,24];brand.alignment=['fill','center'];
    brand.onDraw=function(){var g=this.graphics;icon(g,'lime',9,12,C.lime);text(g,'Key Lime',24,4,C.text,13);};
    var menu=btn(header,'menu','Key Lime help and settings','menu',showHelp,26,24);menu.alignment=['right','center'];
    var breadcrumb=ui.add('statictext',undefined,'Select keyframes to get started',{name:'breadcrumb'});breadcrumb.preferredSize=[300,18];
    breadcrumb.onDraw=function(){var g=this.graphics,s=size(this),v=this.text;while(v.length>3&&g.measureString(v)[0]>s[0])v=v.slice(0,-2)+'…';text(g,v,1,1,C.text,11);};
    var graph=ui.add('group',undefined,undefined,{name:'speedGraph'});graph.preferredSize=[300,250];graph.alignment=['fill','fill'];graph.helpTip='Speed graph. Click a key to show its controller. Hover to read the timeline selection.';
    var graphHits=[];
    graph.onDraw=function(){
        var g=this.graphics,s=size(this),w=s[0],h=s[1],left=12,right=w-12,top=23,bottom=h-16;graphHits=[];
        box(g,1,20,w-2,h-21,C.well,C.border,7);
        for(var i=0;i<5;i++){var x=left+(right-left)*i/4;line(g,x,top,x,bottom,C.border,0.7);}
        for(var j=1;j<4;j++){var y=top+(bottom-top)*j/4;line(g,left,y,right,y,C.border,0.7);}
        line(g,left,bottom,right,bottom,C.muted,0.8);
        if(!model||!tracks.length||invalid){text(g,invalid?'Selection unavailable':'Select keyframes',Math.max(12,(w-132)/2),h/2-14,C.muted,13);text(g,invalid?'Clear the slot or select new keys':'Hover here to see their speed',Math.max(12,(w-190)/2),h/2+7,C.muted,11);return;}
        var duration=model.max-model.min||1,peak=model.peak*1.13;
        function at(p){return [left+(p[0]-model.min)/duration*(right-left),bottom-K.clamp(p[1]/peak,0,1)*(bottom-top)];}
        var fps=tracks[0].comp.frameRate;
        for(i=0;i<5;i++){var time=model.min+duration*i/4,frame=Math.round(time*fps),label=frame%Math.round(fps)===0?Math.round(time)+'s':frame+'f';var tw=g.measureString(label,ScriptUI.newFont('dialog','REGULAR',11))[0];text(g,label,K.clamp(left+(right-left)*i/4-tw/2,1,w-tw-1),2,C.text,11);}
        for(i=0;i<model.graphs.length;i++){
            var data=model.graphs[i],color=K.colors[i];
            for(j=0;j<data.segments.length;j++){
                var points=data.segments[j];g.newPath();for(var n=0;n<points.length;n++){var q=at(points[n]);if(n)g.lineTo(q[0],q[1]);else g.moveTo(q[0],q[1]);}g.strokePath(pen(g,color,i===0?2:1.5));
            }
            var t=data.track;
            for(j=0;j<t.keys.length;j++){
                var key=t.raw[t.keys[j]-1],speed=0;
                for(n=0;n<data.segments.length;n++){var seg=data.segments[n];if(seg.length&&Math.abs(seg[0][0]-key.time)<.000001){speed=seg[0][1];break;}if(seg.length&&Math.abs(seg[seg.length-1][0]-key.time)<.000001)speed=seg[seg.length-1][1];}
                var q=at([key.time,speed]);circle(g,q[0],q[1],i===0?3.5:2.5,color);
                if(i===0){text(g,j+1,q[0]-3,Math.max(top,q[1]-19),C.text,11);graphHits.push({x:q[0],y:q[1],ordinal:j});}
            }
        }
        if(tracks.length>1)for(i=0;i<tracks.length;i++)circle(g,w-10-i*9,11,2.5,K.colors[i]);
    };
    graph.addEventListener('click',function(e){for(var i=0;i<graphHits.length;i++)if(Math.abs(e.clientX-graphHits[i].x)<12&&Math.abs(e.clientY-graphHits[i].y)<18){page=Math.floor(graphHits[i].ordinal/8);updateControllers();fitControls();ui.layout.layout(true);break;}});
    var controllerRows=[row(ui),row(ui)],controllers=[];
    function controller(parent,ordinal){
        var b=parent.add('button',undefined,'',{name:'controller'+(ordinal+1)});b.preferredSize=[68,43];b.alignment=['fill','center'];b.ordinal=ordinal;
        b.helpTip='Blue incoming: drag left for more influence. Lime outgoing: drag right. Middle keys have separate left / right tracks. Shift: fine. Alt: speed. Ctrl: all selected keys. Click to type values.';
        b.onDraw=function(){
            var g=this.graphics,s=size(this),w=s[0],h=s[1],info=controlInfo(this.ordinal),color=info?C.text:C.muted;
            box(g,1,1,w-2,h-2,C.well,C.border,7);text(g,this.ordinal+1,w/2-3,3,color,11);
            if(info){
                var split=!!(info.incoming&&info.outgoing);
                function slider(value,incoming){
                    if(!value)return;
                    var left=split&&!incoming?w/2+5:8,right=split&&incoming?w/2-5:w-8;
                    var fraction=(incoming?100-value.influence:value.influence)/100;
                    line(g,left,h-12,right,h-12,C.muted,1);
                    circle(g,left+(right-left)*fraction,h-12,3.6,incoming?C.key:C.lime);
                }
                slider(info.incoming,true);slider(info.outgoing,false);
            }else line(g,8,h-12,w-8,h-12,C.muted,1);
        };
        b.addEventListener('mousedown',function(e){if(e.button&&e.button!==0)return;act(function(){
            if(!refs)return;var info=controlInfo(b.ordinal);if(!info)return;
            var w=size(b)[0],side=info.incoming&&info.outgoing?(e.clientX<w/2?'in':'out'):(info.outgoing?'out':'in');
            var v=side==='in'?info.incoming:info.outgoing;
            gesture={button:b,x:e.screenX,y:e.screenY,value:e.altKey?v.speed:v.influence,side:side,speed:e.altKey,ordinal:e.ctrlKey||e.metaKey?null:b.ordinal,merge:'Key Lime drag '+new Date().getTime()+' '+(++serial),moved:false};b.dragged=false;
        });});
        b.onClick=function(){if(b.dragged){b.dragged=false;return;}act(function(){numeric(b.ordinal);});};
        controllers.push(b);return b;
    }
    for(var ci=0;ci<8;ci++)controller(controllerRows[Math.floor(ci/4)],ci);
    var interpolation=row(ui);
    btn(interpolation,'linear','Linear','linear',function(){edit({mode:'linear',label:'Linear keys'});});
    btn(interpolation,'easyEase','Easy Ease','ease',function(){edit({mode:'ease',label:'Easy Ease'});});
    btn(interpolation,'easeOut','Ease Out','out',function(){edit({mode:'ease',side:'out',label:'Ease Out'});});
    btn(interpolation,'easeIn','Ease In','in',function(){edit({mode:'ease',side:'in',label:'Ease In'});});
    btn(interpolation,'hold','Hold','hold',function(){edit({mode:'hold',label:'Hold keys'});});
    var spacer=interpolation.add('group');spacer.preferredSize=[3,28];spacer.alignment=['left','center'];
    btn(interpolation,'nudgeLeft','Nudge left 1 frame · Shift: 10','left',function(mod){nudge(mod.shiftKey?-10:-1);});
    btn(interpolation,'nudgeRight','Nudge right 1 frame · Shift: 10','right',function(mod){nudge(mod.shiftKey?10:1);});
    var keyButtons=[],easeButtons=[];
    function stockRow(kind){var r=row(ui),l=r.add('statictext',undefined,kind);l.preferredSize=[28,28];l.alignment=['left','center'];return r;}
    var keyRow=stockRow('Key');
    for(var ki=0;ki<4;ki++)(function(index){var b=btn(keyRow,'key'+(index+1),String(index+1),null,function(mod){
        if(mod.altKey){keySlots[index]=null;if(activeKey===index)activeKey=-1;refresh();msg('Key slot '+(index+1)+' cleared.');return;}
        if(mod.shiftKey||!keySlots[index]){saveKey(index);return;}
        refs=keySlots[index];activeKey=index;page=0;refresh();if(invalid)throw new Error('The stashed source is missing. Alt-click this slot to clear.');msg('Key '+(index+1)+' recalled · edits affect its original source.');
    },27,27);b.helpTip='Key '+(index+1)+': click to stash / recall. Shift: replace. Alt: clear.';keyButtons.push(b);})(ki);
    btn(keyRow,'stashKeys','Stash displayed keyframe selection','bookmark',function(){saveKey(activeKey>=0?activeKey:firstEmpty(keySlots));},26,27);
    btn(keyRow,'revealKeys','Reveal keys in their source composition','eye',function(){K.select(refs);lastSelection=K.signature(K.capture());refresh();msg('Source keys revealed in the timeline.');},26,27);
    btn(keyRow,'clearKeys','Clear active Key slot','trash',function(){if(activeKey<0)throw new Error('Choose a Key slot to clear.');keySlots[activeKey]=null;activeKey=-1;refresh();msg('Key slot cleared.');},26,27);
    var easeRow=stockRow('Ease');
    for(var ei=0;ei<4;ei++)(function(index){var b=btn(easeRow,'ease'+(index+1),String(index+1),null,function(mod){
        activeEase=index;
        if(mod.altKey){easeSlots[index]=null;saveEases();refresh();msg('Ease slot '+(index+1)+' cleared.');return;}
        if(!easeSlots[index]||mod.ctrlKey||mod.metaKey){saveEase(index);return;}
        var r=K.pasteEase(refs,easeSlots[index],!!mod.shiftKey);refresh();result(r,mod.shiftKey?'Reversed ease':'Ease applied');
    },27,27);b.helpTip='Ease '+(index+1)+': click to store / apply. Shift: reverse. Ctrl: replace. Alt: clear.';easeButtons.push(b);})(ei);
    btn(easeRow,'copyEase','Copy easing to active or next empty slot','copy',function(){saveEase(activeEase>=0?activeEase:firstEmpty(easeSlots));},26,27);
    btn(easeRow,'pasteEase','Paste active ease · Shift: reversed','paste',function(mod){if(activeEase<0)throw new Error('Choose an Ease slot first.');var r=K.pasteEase(refs,easeSlots[activeEase],!!mod.shiftKey);refresh();result(r,'Ease pasted');},26,27);
    btn(easeRow,'clearEase','Clear active Ease slot','trash',function(){if(activeEase<0)throw new Error('Choose an Ease slot to clear.');easeSlots[activeEase]=null;saveEases();refresh();msg('Ease slot cleared.');},26,27);
    var status=ui.add('statictext',undefined,'Select keys · hover to refresh',{name:'status'});status.preferredSize=[300,28];status.helpTip='Hover over the panel to refresh from your timeline. Click the menu for shortcuts.';
    status.onDraw=function(){var g=this.graphics,s=size(this),value=this.text;while(value.length>3&&g.measureString(value,ScriptUI.newFont('dialog','REGULAR',10))[0]>s[0])value=value.slice(0,-2)+'…';text(g,value,1,4,C.muted,10);};
    function firstEmpty(a){for(var i=0;i<a.length;i++)if(!a[i])return i;throw new Error('All slots are full. Choose one to replace.');}
    function saveEases(){app.settings.saveSetting('Key Lime','easeSlots',JSON.stringify(easeSlots));}
    function saveKey(i){if(!refs)refs=K.capture();K.resolve(refs);keySlots[i]=K.clone(refs);refs=keySlots[i];activeKey=i;refresh();msg('Stashed selection in Key '+(i+1)+'.');}
    function saveEase(i){if(!refs)refs=K.capture();easeSlots[i]=K.stashEase(refs);activeEase=i;saveEases();refresh();msg('Stored easing in Ease '+(i+1)+'.');}
    function result(r,s){msg(s+' · '+r.changed+' keys'+(r.skipped?' · '+r.skipped+' roving skipped':''));}
    function edit(change){if(!refs)refs=K.capture();var r=K.edit(refs,change);refresh();result(r,'Updated');}
    function nudge(frames){if(!refs)refs=K.capture();K.nudge(refs,frames);if(activeKey>=0)keySlots[activeKey]=refs;refresh();msg('Moved '+frames+' frame'+(Math.abs(frames)===1?'':'s')+'.');}
    function controlInfo(ordinal){
        if(!tracks.length||invalid)return null;var t=tracks[0];if(ordinal>=t.keys.length)return null;
        var k=t.keys[ordinal],key=t.raw[k-1];
        function side(eases,slope){if(!slope)return null;var d=0;for(var i=1;i<slope.length;i++)if(Math.abs(slope[i])>Math.abs(slope[d]))d=i;var e=eases[d]||eases[0];return {influence:e.influence,speed:Math.abs(slope[d])>.000001?e.speed/slope[d]:0};}
        return {incoming:side(key.inEase,K.slopes(t,k-1)),outgoing:side(key.outEase,K.slopes(t,k))};
    }
    function updateControllers(){
        var count=tracks.length&&!invalid?tracks[0].keys.length:2;page=Math.min(page,Math.max(0,Math.ceil(count/8)-1));
        for(var i=0;i<8;i++){controllers[i].ordinal=page*8+i;controllers[i].visible=i<Math.min(8,count-page*8);}
        controllerRows[1].visible=count-page*8>4;
    }
    function refresh(){
        invalid=false;
        try{tracks=refs?K.resolve(refs):[];model=tracks.length?K.graph(tracks):null;}catch(e){invalid=true;tracks=[];model=null;msg(e.message);}
        if(tracks.length){var t=tracks[0];breadcrumb.text=t.comp.name+'  >  '+t.layer.name+'  >  '+t.prop.name+(tracks.length>1?'  +'+(tracks.length-1):'');}
        else breadcrumb.text=invalid?'Source unavailable':'Select keyframes to get started';
        for(var i=0;i<4;i++){
            keyButtons[i].active=activeKey===i;easeButtons[i].active=activeEase===i;
            paintSlot(keyButtons[i],!!keySlots[i],C.key,activeKey===i&&invalid);
            paintSlot(easeButtons[i],!!easeSlots[i],C.ease,false);
        }
        updateControllers();fitControls();ui.layout.layout(true);
    }
    function fitControls(){
        var s=size(ui),w=Math.max(245,s[0]-20),h=Math.max(430,s[1]);
        brand.preferredSize=[w-31,24];breadcrumb.preferredSize=[w,18];status.preferredSize=[w,22];
        var extra=controllerRows[1].visible?49:0;graph.preferredSize=[w,Math.max(170,h-253-extra)];
        for(var rowIndex=0;rowIndex<2;rowIndex++){var count=0;for(var j=rowIndex*4;j<rowIndex*4+4;j++)if(controllers[j].visible)count++;
            for(j=rowIndex*4;j<rowIndex*4+4;j++)controllers[j].preferredSize=[Math.max(42,(w-Math.max(0,count-1)*5)/Math.max(1,count)),43];}
        for(var i=0;i<interpolation.children.length;i++)if(interpolation.children[i].type==='button')interpolation.children[i].preferredSize=[(w-38)/7,28];
        for(var r=0;r<2;r++){var stock=r?easeRow:keyRow;for(i=0;i<stock.children.length;i++)if(stock.children[i].type==='button')stock.children[i].preferredSize=[(w-63)/7,27];}
    }
    function paintSlot(b,filled,color,error){b.onDraw=function(){var g=this.graphics,s=size(this),accent=error?[.9,.37,.3,1]:color;box(g,1,1,s[0]-2,s[1]-2,filled?(this.active?accent:[accent[0]*.30,accent[1]*.30,accent[2]*.30,1]):C.bg,filled?accent:C.border,8);text(g,this.text,s[0]/2-3,(s[1]-15)/2,this.active&&filled?C.well:filled?accent:C.muted,12);};}
    function checkProject(){
        var path=app.project.file?app.project.file.fsName:null,summary=app.run('project.summary',{}),history=summary.undo||[];
        // Conservatively clear on every path change, including Save As.
        if(priorPath!==path||(hadHistory&&!history.length)){
            keySlots=[null,null,null,null];refs=null;activeKey=-1;lastSelection='';page=0;refresh();
        }
        priorPath=path;hadHistory=history.length>0;
    }
    function hover(){
        if(busy||gesture)return;var now=new Date().getTime();if(now-lastHover<180)return;lastHover=now;busy=true;
        try{
            checkProject();var next=null,why='';try{next=K.capture();}catch(captureError){why=captureError.message;}
            if(!next&&activeKey<0){refs=null;lastSelection='';msg(why||'Select keys · hover to refresh');}
            if(next){var signature=K.signature(next);if(signature!==lastSelection){refs=next;activeKey=-1;lastSelection=signature;page=0;msg(next.length+' propert'+(next.length===1?'y':'ies')+' selected · drag a controller to ease');}}
            refresh();
        }catch(e){msg(e.message);}finally{busy=false;}
    }
    ui.addEventListener('mouseover',hover);
    ui.addEventListener('mousemove',function(e){
        if(!gesture){hover();return;}
        if(Math.abs(e.screenX-gesture.x)<3&&!gesture.moved)return;
        act(function(){
            var dx=e.screenX-gesture.x,scale=e.shiftKey?.1:1;
            var value=gesture.speed?K.clamp(gesture.value+dx*.02*scale,-100,100):K.clamp(gesture.value+dx*.6*scale*(gesture.side==='in'?-1:1),.1,100);
            var r=K.scrub(refs,gesture.ordinal,gesture.side,value,gesture.speed,gesture.merge);
            gesture.moved=true;gesture.button.dragged=true;refresh();msg((gesture.side==='in'?'In':'Out')+' '+(gesture.speed?'speed ':'influence ')+Math.round(value*10)/10+(gesture.speed?'×':'%')+(r.skipped?' · roving skipped':''));
        });
    });
    ui.addEventListener('mouseup',function(){if(gesture&&gesture.moved)gesture.button.dragged=true;gesture=null;});
    ui.addEventListener('mouseout',function(){/* Pointer capture continues on the root while dragging. */});
    function numeric(ordinal){
        var info=controlInfo(ordinal);if(!info)throw new Error('Select keyframes first.');
        var dialog=new Window('dialog','Key '+(ordinal+1)+' · velocity');dialog.orientation='column';dialog.alignChildren=['fill','top'];dialog.margins=16;dialog.spacing=10;
        var fields=[];
        function field(side,value){if(!value)return;var r=row(dialog);r.add('statictext',undefined,side==='in'?'Incoming':'Outgoing');var influence=r.add('edittext',undefined,String(Math.round(value.influence*100)/100),{name:side+'Influence'});influence.characters=7;r.add('statictext',undefined,'%');var speed=r.add('edittext',undefined,String(Math.round(value.speed*1000)/1000),{name:side+'Speed'});speed.characters=7;r.add('statictext',undefined,'× speed');fields.push({side:side,influence:influence,speed:speed});}
        field('in',info.incoming);field('out',info.outgoing);
        var note=dialog.add('statictext',undefined,'Speed is relative to this segment’s average.');
        var all=dialog.add('checkbox',undefined,'Apply to all selected keys');
        var r=row(dialog);var apply=btn(r,'numericApply','Apply',null,function(){
            var changes=[];for(var i=0;i<fields.length;i++){var f=fields[i],inf=Number(f.influence.text),sp=Number(f.speed.text);if(!f.influence.text.length||!f.speed.text.length||!isFinite(inf)||inf<.1||inf>100||!isFinite(sp)||Math.abs(sp)>100){note.text='Influence: 0.1–100. Speed: −100–100.';return;}changes.push({side:f.side,influence:inf,speed:sp});}
            app.beginUndoGroup('Key Lime · Edit velocity');try{for(i=0;i<changes.length;i++){if(!all.value)changes[i].ordinal=ordinal;K.edit(refs,changes[i]);}}finally{app.endUndoGroup();}refresh();msg('Key velocity updated.');dialog.close();
        },80,28);btn(r,'numericCancel','Cancel',null,function(){dialog.close();},80,28);dialog.defaultElement=apply;dialog.show();
    }
    function showHelp(){
        var d=new Window('dialog','Key Lime '+K.version);d.orientation='column';d.alignChildren=['fill','top'];d.spacing=10;d.margins=18;
        var help=d.add('statictext',undefined,'KEY LIME  /  KEYFRAME STASH & EASING\n\nSelect timeline keys and hover over this panel.\nUp to 8 properties are overlaid in different colors.\n\nCONTROLLERS\nBlue incoming: drag left. Lime outgoing: drag right.\nMiddle keys have separate incoming / outgoing tracks.\nShift: fine. Alt: normalized speed. Ctrl: all selected keys.\nClick a controller to type both sides. Click a graph key\nto show its controller page when more than 8 are selected.\n\nKEY SLOTS\nEmpty slot: stash. Filled slot: recall without switching comps.\nShift-click: replace. Alt-click: clear. Eye: reveal source.\n\nEASE SLOTS\nEmpty slot: store the first property’s ease. Filled slot: apply.\nShift-click: reverse. Ctrl-click: replace. Alt-click: clear.\nEase slots persist between launches; Key slots are session-only.\n\nARROWS\nNudge by one frame. Shift: ten frames. One Undo per drag.\n\nMissing or ambiguous source keys are never guessed.\nRoving keys are skipped; disable Roving to ease them.',{multiline:true});help.preferredSize=[400,445];
        var r=row(d);btn(r,'refreshSelection','Read timeline',null,function(){refs=K.capture();activeKey=-1;lastSelection=K.signature(refs);refresh();d.close();},122,28);
        btn(r,'clearAllKeySlots','Clear Key slots',null,function(){keySlots=[null,null,null,null];activeKey=-1;refresh();d.close();msg('Key slots cleared.');},122,28);
        btn(r,'closeHelp','Done',null,function(){d.close();},80,28);d.show();
    }
    ui.onResize=ui.onResizing=function(){fitControls();this.layout.resize();};
    refresh();hover();
    if(ui instanceof Window)ui.show();else ui.layout.layout(true);
})(this);
