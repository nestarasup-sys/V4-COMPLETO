"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const core=require("../src/core.js");
test("16 character slots, first slot ready",()=>{
 const p=core.freshProject();assert.equal(p.slots.length,16);assert.ok(p.slots[0]);assert.equal(p.slots[1],null);
});
test("12 shared pose slots survive normalization and seed new characters from slot one",()=>{
 const project=core.freshProject(),pose=core.freshPose();pose.head.x=42;pose.head.rotation=-12;
 const entry=core.newPoseEntry("Pose base",pose);project.poseSlots[0]=entry;
 const restored=core.normalize(JSON.parse(JSON.stringify(project)));
 assert.equal(restored.poseSlots.length,12);assert.equal(restored.poseSlots[0].name,"Pose base");
 assert.equal(restored.poseSlots[0].pose.head.x,42);
 const character=core.makeCharacter(3,restored.poseSlots[0]);
 assert.deepEqual(character.pose,restored.poseSlots[0].pose);
 assert.deepEqual(character.workingPose,restored.poseSlots[0].pose);
 const legacy={format:project.format,version:project.version,slots:project.slots};
 legacy.slots[0].savedPoses=[entry];
 assert.equal(core.normalize(legacy).poseSlots[0].name,"Pose base","projetos anteriores recuperam poses salvas para a grade compartilhada");
});
test("all ten body pieces with parent joints",()=>{
 const ch=core.makeCharacter(0);assert.equal(core.PARTS.length,10);assert.equal(Object.keys(ch.pose).length,10);
 const matrix=core.transforms(ch);assert.equal(Object.keys(matrix).length,10);
});
test("layer order and visibility are normalized and control body rendering",()=>{
 const project=core.freshProject(),character=project.slots[0];
 character.layerOrder=["head","torso","head","unknown"];
 character.hiddenParts=["head","unknown","head"];
 const restored=core.normalize(project).slots[0];
 assert.equal(restored.layerOrder.length,10);assert.equal(new Set(restored.layerOrder).size,10);
 assert.equal(restored.layerOrder[0],"head");assert.deepEqual(restored.hiddenParts,["head"]);
 const svg=core.renderSVG(restored,{editor:true,joints:true});
 assert.equal(svg.includes('<g data-part="head" transform'),false,"camada oculta não desenha cabeça nem alça de junta");
 assert.ok(svg.indexOf('<g data-part="torso" transform')<svg.indexOf('<g data-part="armLU" transform'),"ordem customizada controla a sequência de desenho");
});
test("hierarchical joint anchors stay connected through parent and child rotation",()=>{
 const ch=core.makeCharacter(0);
 for(const preset of Object.keys(core.PRESETS)){
  core.applyPreset(ch,preset);
  const joints=core.jointPositions(ch);
  for(const part of core.PARTS.filter(piece=>piece.joint)){
   const {parent,child}=joints[part.id];
   assert.ok(Math.hypot(parent[0]-child[0],parent[1]-child[1])<1e-6,
    `${part.name}: pivô filho deve coincidir com a junta do pai no preset ${preset}`);
  }
 }
});
test("poses change rig without changing shape data",()=>{
 const ch=core.makeCharacter(0);const before=core.transforms(ch).armRU.join(",");
 core.applyPreset(ch,"aceno");assert.notEqual(core.transforms(ch).armRU.join(","),before);
 assert.equal(Object.keys(core.ART).length,10,"cada parte usa um recorte do PNG original");
 assert.ok(core.ART.head.image.startsWith("data:image/png;base64,"));
 assert.ok(core.ART.head.shade.startsWith("data:image/png;base64,"));
 const tinted={...ch,skin:"#123456"},svg=core.renderSVG(tinted);
 assert.ok(svg.includes("0.07058823529411765 0 0 0 0 0.20392156862745098"),"máscara de pele deve adotar a cor escolhida sem redesenhar a arte");
 assert.ok(svg.includes("<image data-part=\"head\""),"a renderização usa o PNG original, não o contorno vetorial refeito");
});
test("JSON roundtrip and rejects incompatible formats",()=>{
 const p=core.freshProject();const output=core.normalize(JSON.parse(JSON.stringify(p)));
 assert.equal(output.slots[0].name,p.slots[0].name);
 assert.equal(output.version,1);assert.equal(output.slots.length,16);
 assert.throws(()=>core.normalize({format:"v3",slots:[]}));
});
test("version 1 project normalization preserves characters and draft pose data",()=>{
 const project=core.freshProject();project.slots[2]=core.makeCharacter(2);project.slots[2].pose.armRU.rotation=-37;
 const old={format:"gacha-body-v1",version:1,slots:project.slots};
 const migrated=core.normalize(old);
 assert.equal(migrated.version,1);assert.equal(migrated.slots[2].pose.armRU.rotation,-37);
 assert.deepEqual(migrated.slots[2].workingPose,project.slots[2].workingPose);
});
test("rejects untrusted geometry values and escapes names",()=>{
 const p=core.freshProject();p.slots[0].pose.head.rotation=99999;p.slots[0].name='<script>alert(1)</script>';
 const clean=core.normalize(p);assert.equal(clean.slots[0].pose.head.rotation,180);
 assert.ok(!core.renderSVG(clean.slots[0],{editor:true,joints:true}).includes("<script>"));
});
test("renderer supports editor and 9:16 preview",()=>{
 const ch=core.makeCharacter(0);
 assert.ok(core.renderSVG(ch,{preview:true}).includes("107 0 909 1616"));
 assert.ok(core.renderSVG(ch,{editor:true,joints:true}).includes("rig-joint"));
 assert.ok(core.renderSVG(ch,{}).includes("viewBox"));
});


test("edits to working pose do not change the published pose",()=>{
 const ch=core.makeCharacter(0);
 ch.workingPose.armLU.x=99;
 assert.notEqual(ch.workingPose.armLU.x,ch.pose.armLU.x);
 const restored=core.normalize({format:"gacha-body-v1",version:1,slots:[ch,...Array(15).fill(null)]});
 assert.equal(restored.slots[0].workingPose.armLU.x,99);
 assert.equal(restored.slots[0].pose.armLU.x,ch.pose.armLU.x);
});
test("old character projects migrate to independent working pose",()=>{
 const project=core.freshProject();
 delete project.slots[0].workingPose;delete project.slots[0].savedPoses;
 const migrated=core.normalize(project).slots[0];
 assert.deepEqual(migrated.workingPose,migrated.pose);
 assert.deepEqual(migrated.savedPoses,[]);
});
test("pose presets save, reload and apply explicitly",()=>{
 const ch=core.makeCharacter(0);
 core.applyPreset({pose:ch.workingPose},"aceno");
 const saved=core.newPoseEntry("Meu aceno",ch.workingPose);
 ch.savedPoses.push(saved);
 assert.equal(ch.pose.armRU.rotation,0);
 ch.pose=core.copyPose(saved.pose);
 assert.equal(ch.pose.armRU.rotation,-55);
});
test("saved poses are independent copies and imported geometry is bounded",()=>{
 const ch=core.makeCharacter(0);ch.workingPose.head.rotation=23;
 const entry=core.newPoseEntry("Teste",ch.workingPose);ch.workingPose.head.rotation=70;
 assert.equal(entry.pose.head.rotation,23);
 assert.equal(core.normalizePose({head:{x:9999,rotation:-250}}).head.x,600);
 assert.equal(core.normalizePose({head:{x:9999,rotation:-250}}).head.rotation,-180);
});
