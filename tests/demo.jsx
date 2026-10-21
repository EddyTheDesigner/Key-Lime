// A self-contained demonstration project; this script only adds its own comps.
var c=app.project.items.addComp('Key Lime · Motion Study',960,540,1,6,30);c.openInViewer();
var bg=c.layers.addSolid([.035,.045,.03],'Background',960,540,1,6);bg.locked=true;
var rail=c.layers.addSolid([.18,.23,.13],'Motion rail',640,2,1,6);rail.transform.position.setValue([480,320]);
var ball=c.layers.addSolid([.67,.83,.33],'Lime',88,88,1,6);
var mask=ball.Masks.addProperty('ADBE Mask Atom'),shape=new Shape();shape.vertices=[[44,0],[88,44],[44,88],[0,44]];shape.inTangents=[[-24.3,0],[0,-24.3],[24.3,0],[0,24.3]];shape.outTangents=[[24.3,0],[0,24.3],[-24.3,0],[0,-24.3]];shape.closed=true;mask.property('ADBE Mask Shape').setValue(shape);
ball.transform.position.setValuesAtTimes([.5,1.5,3],[[180,320],[480,320],[780,320]]);
var p=ball.transform.position;for(var i=1;i<=3;i++){p.setTemporalEaseAtKey(i,[new KeyframeEase(0,i===2?70:65)],[new KeyframeEase(0,i===2?50:65)]);p.setInterpolationTypeAtKey(i,KeyframeInterpolationType.BEZIER);p.setSelectedAtKey(i,true);}
var title=c.layers.addText('KEY LIME');var td=title.property('ADBE Text Properties').property('ADBE Text Document').value;td.fontSize=52;td.fillColor=[.81,.88,.72];title.property('ADBE Text Properties').property('ADBE Text Document').setValue(td);title.transform.position.setValue([170,150]);
var sub=c.layers.addText('A LITTLE EASE GOES A LONG WAY');var st=sub.property('ADBE Text Properties').property('ADBE Text Document').value;st.fontSize=16;st.fillColor=[.5,.6,.43];sub.property('ADBE Text Properties').property('ADBE Text Document').setValue(st);sub.transform.position.setValue([174,195]);
var other=app.project.items.addComp('Key Lime · Reuse',960,540,1,6,30);other.openInViewer();var tile=other.layers.addSolid([.33,.67,.88],'Blue tile',100,100,1,6);tile.transform.rotation.setValuesAtTimes([0,1,2],[0,180,360]);tile.transform.opacity.setValuesAtTimes([0,1,2],[20,100,40]);
c.openInViewer();for(var j=1;j<=c.numLayers;j++)c.layer(j).selected=false;ball.selected=true;app.run('keys.select',{keys:[]});for(i=1;i<=3;i++)p.setSelectedAtKey(i,true);c.time=1.15;
