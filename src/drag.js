(function(){
"use strict";
var A=window.GachaEditor,C=window.GachaCore,g=null,stage=document.getElementById("editor-stage");
function coords(e){
 var svg=stage.querySelector("svg");if(!svg)return null;
 var t=svg.getScreenCTM();if(!t)return null;
 var p=new DOMPoint(e.clientX,e.clientY).matrixTransform(t.inverse());
 return {x:p.x,y:p.y};
}
stage.addEventListener("pointerdown",function(e){
 if(e.button!==0||!A.current())return;
 var hit=e.target.closest("[data-part]");if(!hit||!stage.contains(hit))return;
 var id=hit.dataset.part;if(!C.BY_ID[id])return;
 var s=A.state,ch=A.current(),p=coords(e);if(!p)return;
 if(ch.mirrored)p.x=C.WIDTH-p.x;
 var matrices=C.transforms(ch),part=C.BY_ID[id],pivot=C.point(matrices[id],part.pivot);
 var parent=part.parent?matrices[part.parent]:[1,0,0,1,0,0];
 g={id:id,begin:p,pivot:pivot,parent:parent,original:Object.assign({},ch.pose[id]),before:A.serialize()};
 s.part=id;A.render();e.preventDefault();
});
document.addEventListener("pointermove",function(e){
 if(!g)return;
 var p=coords(e),ch=A.current();if(!p||!ch)return;
 if(ch.mirrored)p.x=C.WIDTH-p.x;
 var s=A.state,part=ch.pose[g.id];
 if(s.tool==="rotate"){
  var a=Math.atan2(g.begin.y-g.pivot[1],g.begin.x-g.pivot[0]);
  var b=Math.atan2(p.y-g.pivot[1],p.x-g.pivot[0]);
  var angle=g.original.rotation+(b-a)*180/Math.PI;
  part.rotation=C.clamp(Math.round(angle/(s.snap?5:1))*(s.snap?5:1),-180,180);
 }else{
  var m=g.parent,dx=p.x-g.begin.x,dy=p.y-g.begin.y,det=m[0]*m[3]-m[1]*m[2];
  var x=g.original.x+(m[3]*dx-m[2]*dy)/det;
  var y=g.original.y+(-m[1]*dx+m[0]*dy)/det;
  part.x=C.clamp(Math.round(x/(s.snap?10:1))*(s.snap?10:1),-600,600);
  part.y=C.clamp(Math.round(y/(s.snap?10:1))*(s.snap?10:1),-600,600);
 }
 A.draw();var r=document.getElementById("rotation-slider");if(r){r.value=part.rotation;document.getElementById("rotation-value").textContent=Math.round(part.rotation)+"°";}
 e.preventDefault();
});
function end(){if(!g)return;A.history(g.before);g=null;A.render();}
document.addEventListener("pointerup",end);
document.addEventListener("pointercancel",end);
window.addEventListener("blur",end);
})();