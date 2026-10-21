var pass=0;
function ok(value,message){if(!value)throw new Error('FAIL '+message);pass++;writeLn('PASS '+message);}
function near(a,b,message){ok(Math.abs(a-b)<.002,message+' ('+a+')');}
function throws(fn,message){var thrown=false;try{fn();}catch(e){thrown=true;}ok(thrown,message);}
var K=KeyLime,c=app.project.items.addComp('Key Lime tests',640,360,1,10,30);c.openInViewer();
var l=c.layers.addNull();l.name='Lime';var p=l.transform.opacity;
p.setValuesAtTimes([0,1,2],[0,100,20]);p.setSelectedAtKey(1,true);p.setSelectedAtKey(2,true);
var refs=K.capture();ok(refs.length===1&&refs[0].keys.length===2,'Capture selected property and keys');
var undo=app.run('project.summary',{}).undo.length;
K.edit(refs,{mode:'ease'});near(p.keyOutTemporalEase(1)[0].speed,0,'Easy Ease starts at rest');
ok(p.keyOutInterpolationType(1)===KeyframeInterpolationType.BEZIER,'Easy Ease sets Bezier');
ok(app.run('project.summary',{}).undo.length===undo+1,'Multi-key edit is one undo step');
app.run('edit.undo',{});ok(p.keyOutInterpolationType(1)===KeyframeInterpolationType.LINEAR,'Undo restores original interpolation');
K.edit(refs,{mode:'hold'});ok(p.keyOutInterpolationType(1)===KeyframeInterpolationType.HOLD,'Hold interpolation');
K.edit(refs,{mode:'ease',side:'out'});ok(p.keyInInterpolationType(2)===KeyframeInterpolationType.HOLD,'Outgoing ease preserves incoming Hold');
K.edit(refs,{mode:'linear'});ok(p.keyInInterpolationType(2)===KeyframeInterpolationType.LINEAR,'Linear interpolation');
K.edit(refs,{influence:72,speed:.25});near(p.keyOutTemporalEase(1)[0].influence,72,'Influence edit');near(p.keyOutTemporalEase(1)[0].speed,25,'Normalized speed converts to property units');
var saved=K.clone(refs);l.name='Renamed';p.setValueAtTime(.5,40);var recovered=K.resolve(saved);
ok(recovered[0].keys[1]===3,'Inserted keys do not shift saved addresses');ok(recovered[0].layer.name==='Renamed','Renamed layer recovery');
p.removeKey(2);var preset=K.stashEase(saved);ok(K.validEase(preset),'Ease snapshot validates');
var c2=app.project.items.addComp('Other comp',640,360,1,10,30);c2.openInViewer();var l2=c2.layers.addNull(),q=l2.transform.rotation;
q.setValuesAtTimes([0,2],[0,360]);q.setSelectedAtKey(1,true);q.setSelectedAtKey(2,true);var target=K.capture();
K.pasteEase(target,preset,false);near(q.keyOutTemporalEase(1)[0].speed,45,'Ease scales to new value and duration');
K.edit(saved,{ordinal:0,influence:80,speed:.15,side:'out'});ok(app.project.activeItem.id===c2.id,'Cross-comp edits retain active composition');
near(p.keyOutTemporalEase(1)[0].influence,80,'Cross-comp edit reaches source');
K.edit(saved,{ordinal:1,influence:30,speed:.6,side:'in'});preset=K.stashEase(saved);K.pasteEase(target,preset,true);
near(q.keyOutTemporalEase(1)[0].influence,30,'Reverse paste swaps incoming influence to outgoing');near(q.keyOutTemporalEase(1)[0].speed,108,'Reverse paste swaps normalized speed');
K.select(saved);ok(app.project.activeItem.id===c.id,'Reveal opens original composition');ok(p.selectedKeys.length===2,'Reveal selects stored keys');
K.nudge(saved,1);near(p.keyTime(1),1/30,'Nudge moves first selected key by one comp frame');near(p.keyTime(2),1+1/30,'Nudge preserves spacing');
ok(K.resolve(saved)[0].keys.length===2,'Nudge updates saved addresses');app.run('edit.undo',{});
ok(K.resolve(saved)[0].keys[0]===1,'Value recovery finds moved keys after Undo');
var collision=K.clone(refs);throws(function(){K.nudge(collision,60);},'Nudge refuses to cross an unselected key');near(p.keyTime(1),0,'Failed nudge leaves keys untouched');
l.locked=true;throws(function(){K.edit(refs,{influence:50});},'Locked layer rejected before editing');l.locked=false;
throws(function(){K.edit(refs,{influence:NaN});},'Invalid numeric edit rejected');
var missing=K.clone(refs);p.removeKey(2);throws(function(){K.resolve(missing);},'Deleted key produces missing-source error');
p.setValueAtTime(1,100);p.setSelectedAtKey(1,true);p.setSelectedAtKey(2,true);refs=K.capture();
var scale=l.transform.scale;scale.setValuesAtTimes([0,1],[[100,50],[200,250]]);scale.setSelectedAtKey(1,true);scale.setSelectedAtKey(2,true);
var multi=K.capture();ok(multi.length===2,'Capture multiple properties');K.edit(multi,{influence:60,speed:.5});near(scale.keyOutTemporalEase(1)[0].speed,50,'Vector x normalized speed');near(scale.keyOutTemporalEase(1)[1].speed,100,'Vector y normalized speed');
var before=app.run('project.summary',{}).undo.length;K.scrub(multi,0,'out',70,false,'test-drag-1');K.scrub(multi,0,'out',85,false,'test-drag-1');
ok(app.run('project.summary',{}).undo.length===before+1,'Live multi-property drag is one Undo');near(scale.keyOutTemporalEase(1)[0].influence,85,'Drag reaches every selected property');app.run('edit.undo',{});near(scale.keyOutTemporalEase(1)[0].influence,60,'One Undo restores whole drag');
var graph=K.graph(K.resolve(multi));ok(graph.graphs.length===2,'Two color-coded graph tracks');ok(graph.peak>0&&isFinite(graph.peak),'Graph has finite speed scale');
var position=l.transform.position;position.setValuesAtTimes([0,1],[[0,0],[100,0]]);position.setRovingAtKey(1,false);
app.run('keys.select',{keys:[]});position.setSelectedAtKey(1,true);position.setSelectedAtKey(2,true);var spatial=K.capture();K.edit(spatial,{mode:'ease'});ok(K.graph(K.resolve(spatial)).peak>0,'Spatial speed graph');
var newLayer=c.layers.addNull();newLayer.stretch=200;var stretched=newLayer.transform.opacity;stretched.setValuesAtTimes([0,2],[0,100]);app.run('keys.select',{keys:[]});stretched.setSelectedAtKey(1,true);stretched.setSelectedAtKey(2,true);var sr=K.capture();K.nudge(sr,1);near(stretched.keyTime(1),1/30,'Nudge honors stretched comp time');
var bad=K.clone(preset);bad.keys[0].incoming[0].influence=101;ok(!K.validEase(bad),'Corrupt ease slot rejected');
// Compare the drawn speed with the installed engine's actual value sampling.
c2.openInViewer();app.run('keys.select',{keys:[]});q.setSelectedAtKey(1,true);q.setSelectedAtKey(2,true);target=K.capture();
K.edit(target,{influence:85,speed:.2});var gt=K.resolve(target)[0],samples=K.segment(gt,1);
for(var si=16;si<=80;si+=16){var point=samples[si],dt=.0001,velocity=Math.abs((q.valueAtTime(point[0]+dt,true)-q.valueAtTime(point[0]-dt,true))/(2*dt));ok(Math.abs(velocity-point[1])<.5,'Speed graph matches native crossed-handle derivative at sample '+si);}
var flat=l2.transform.opacity;flat.setValuesAtTimes([0,1],[50,50]);flat.setTemporalEaseAtKey(1,[new KeyframeEase(0,33)],[new KeyframeEase(70,70)]);flat.setTemporalEaseAtKey(2,[new KeyframeEase(-70,70)],[new KeyframeEase(0,33)]);flat.setInterpolationTypeAtKey(1,KeyframeInterpolationType.BEZIER);flat.setInterpolationTypeAtKey(2,KeyframeInterpolationType.BEZIER);app.run('keys.select',{keys:[]});flat.setSelectedAtKey(1,true);flat.setSelectedAtKey(2,true);
ok(K.graph(K.resolve(K.capture())).peak>60,'Equal-value overshoot retains a nonzero speed graph');
throws(function(){K.stashEase(K.capture());},'Unnormalizable equal-value speed is rejected clearly');
c.openInViewer();app.run('keys.select',{keys:[]});position.setValueAtTime(2,[200,0]);for(var sk=1;sk<=3;sk++)position.setSelectedAtKey(sk,true);position.setRovingAtKey(2,true);var rover=K.edit(K.capture(),{mode:'ease'});ok(rover.skipped===1,'Roving interior key is skipped');
position.setRovingAtKey(2,false);app.run('keys.select',{keys:[]});position.setSelectedAtKey(1,true);position.setSelectedAtKey(2,true);var pc=K.capture();var nested=c.layers.precompose([l.index],'Nested lime',true);var recoveredNested=K.resolve(pc);ok(recoveredNested[0].comp.id===nested.id,'Stashed property follows precomposition');
var lc=app.project.items.addComp('Limits',100,100,1,3,30);lc.openInViewer();for(var pp=0;pp<9;pp++){var ll=lc.layers.addNull(),pr=ll.transform.opacity;pr.setValuesAtTimes([0,1],[0,100]);for(var kk=1;kk<=2;kk++)pr.setSelectedAtKey(kk,true);}
for(var jj=1;jj<=lc.numLayers;jj++){var lp=lc.layer(jj).transform.opacity;lp.setSelectedAtKey(1,true);lp.setSelectedAtKey(2,true);}
throws(function(){K.capture();},'More than eight properties is rejected instead of truncated');
app.run('keys.select',{keys:[]});for(var jj=1;jj<=8;jj++){var lp=lc.layer(jj).transform.opacity;lp.setSelectedAtKey(1,true);lp.setSelectedAtKey(2,true);}
var eight=K.capture();ok(eight.length===8&&K.graph(K.resolve(eight)).graphs.length===8,'Eight properties produce eight speed graphs');
// Independent middle handles retain effective Position velocity and the other segment.
var sc=app.project.items.addComp('Slider regression',640,360,1,5,30);sc.openInViewer();
var sl=sc.layers.addNull(),sp=sl.transform.position;sp.setValuesAtTimes([0,1,2],[[300,100],[100,200],[200,300]]);
for(var sk=1;sk<=3;sk++)sp.setSelectedAtKey(sk,true);var srefs=K.capture(),original=sp.__keys()[1];
K.scrub(srefs,1,'in',65,false,'position-in');
near(sp.keyInTemporalEase(2)[0].speed,original.inEase[0].speed,'Incoming Position drag preserves path speed instead of signed X velocity');
near(sp.keyInTemporalEase(2)[0].influence,65,'Middle incoming influence changes');
near(sp.keyOutTemporalEase(2)[0].speed,original.outEase[0].speed,'Middle incoming drag preserves outgoing speed');
ok(sp.keyOutInterpolationType(2)===KeyframeInterpolationType.LINEAR,'Middle incoming drag preserves outgoing Linear');
sp.setTemporalAutoBezierAtKey(2,true);original=sp.__keys()[1];
var unchanged=JSON.stringify(K.segment(K.resolve(srefs)[0],2));
K.scrub(srefs,1,'in',60,false,'auto-in');K.scrub(srefs,1,'in',75,false,'auto-in');
near(sp.keyInTemporalEase(2)[0].speed,original.inEase[0].speed,'Auto Bezier incoming edit retains effective speed');
near(sp.keyOutTemporalEase(2)[0].speed,original.outEase[0].speed,'Auto Bezier incoming edit retains opposite speed');
near(sp.keyOutTemporalEase(2)[0].influence,original.outEase[0].influence,'Auto Bezier incoming edit retains opposite influence');
ok(JSON.stringify(K.segment(K.resolve(srefs)[0],2))===unchanged,'Middle incoming edit leaves outgoing speed curve unchanged');
app.run('edit.undo',{});ok(sp.keyTemporalAutoBezier(2),'Undo restores automatic easing');
near(sp.keyInTemporalEase(2)[0].influence,original.inEase[0].influence,'One Undo restores influence before the entire automatic-key drag');
unchanged=JSON.stringify(K.segment(K.resolve(srefs)[0],1));K.scrub(srefs,1,'out',55,false,'auto-out');
near(sp.keyOutTemporalEase(2)[0].speed,original.outEase[0].speed,'Auto Bezier outgoing edit retains effective speed');
ok(JSON.stringify(K.segment(K.resolve(srefs)[0],1))===unchanged,'Middle outgoing edit leaves incoming speed curve unchanged');
sp.setInterpolationTypeAtKey(2,KeyframeInterpolationType.HOLD,KeyframeInterpolationType.BEZIER);
K.scrub(srefs,1,'out',80,false,'hold-out');ok(sp.keyInInterpolationType(2)===KeyframeInterpolationType.HOLD,'Outgoing drag preserves opposite Hold');
K.edit(srefs,{mode:'ease'});K.scrub(srefs,1,'in',70,false,'easy-in');K.scrub(srefs,1,'out',80,false,'easy-out');
near(sp.keyInTemporalEase(2)[0].speed,0,'Independent incoming ease stays at rest');near(sp.keyOutTemporalEase(2)[0].speed,0,'Independent outgoing ease stays at rest');
var smooth=K.graph(K.resolve(srefs));ok(smooth.graphs[0].segments.every(function(seg){return seg.every(function(pt){return isFinite(pt[1])&&pt[1]>=0;});}),'Three-key speed graph remains finite after both handle edits');
writeLn('ALL '+pass+' ASSERTIONS PASSED');
