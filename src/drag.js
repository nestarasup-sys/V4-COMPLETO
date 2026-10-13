(function(){
"use strict";
const A=window.GachaEditor,C=window.GachaCore,stage=document.getElementById("editor-stage");
let gesture=null;
function pointerInSVG(e){
 const svg=stage.querySelector("svg");if(!svg)return null;
 const matrix=svg.getScreenCTM();if(!matrix)return null;
 const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
 if(A.editing()?.mirrored)p.x=C.WIDTH-p.x;
 return {x:p.x,y:p.y};
}
stage.addEventListener("pointerdown",e=>{
 if(e.button!==0||A.state.page!=="pose"||!A.current())return;
 const partElement=e.target.closest("[data-part]");
 if(!partElement||!stage.contains(partElement))return;
 const id=partElement.dataset.part;if(!C.BY_ID[id])return;
 const p=pointerInSVG(e),ch=A.editing();if(!p||!ch)return;
 const matrices=C.transforms(ch),piece=C.BY_ID[id];
 const pivot=C.point(matrices[id],piece.pivot);
 const parent=piece.parent?matrices[piece.parent]:[1,0,0,1,0,0];
 gesture={id,start:p,pivot,parent,original:{...ch.pose[id]},before:A.serialize(),
   mode:e.altKey?"rotate":A.state.tool};
 A.state.part=id;
 A.render();
 e.preventDefault();
});
document.addEventListener("pointermove",e=>{
 if(!gesture||A.state.page!=="pose")return;
 const pt=pointerInSVG(e),ch=A.editing();if(!pt||!ch)return;
 const g=gesture,v=ch.pose[g.id],s=A.state;
 if(g.mode==="rotate"){
  const start=Math.atan2(g.start.y-g.pivot[1],g.start.x-g.pivot[0]);
  const now=Math.atan2(pt.y-g.pivot[1],pt.x-g.pivot[0]);
  const angle=g.original.rotation+(now-start)*180/Math.PI;
  const step=s.snap?5:1;
  v.rotation=C.clamp(Math.round(angle/step)*step,-180,180);
 }else{
  const m=g.parent,dx=pt.x-g.start.x,dy=pt.y-g.start.y,det=m[0]*m[3]-m[1]*m[2];
  if(Math.abs(det)<1e-8)return;
  const x=g.original.x+(m[3]*dx-m[2]*dy)/det,y=g.original.y+(-m[1]*dx+m[0]*dy)/det;
  const step=s.snap?10:1;
  v.x=C.clamp(Math.round(x/step)*step,-600,600);
  v.y=C.clamp(Math.round(y/step)*step,-600,600);
 }
 A.draw();
 const rotation=document.getElementById("rotation-value");
 if(rotation)rotation.textContent=Math.round(v.rotation)+"°";
 const slider=document.getElementById("rotation-slider");if(slider)slider.value=v.rotation;
 for(const field of document.querySelectorAll("[data-pose-field]")){
  if(!field.matches(":focus"))field.value=Math.round(v[field.dataset.poseField]*10)/10;
 }
 e.preventDefault();
});
function endGesture(){
 if(!gesture)return;
 const previous=gesture.before;gesture=null;A.history(previous);A.render();
}
document.addEventListener("pointerup",endGesture);
document.addEventListener("pointercancel",endGesture);
window.addEventListener("blur",endGesture);
})();
