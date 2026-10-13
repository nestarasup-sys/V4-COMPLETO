"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const core=require("../src/core.js");
test("16 character slots, first slot ready",()=>{
 const p=core.freshProject();assert.equal(p.slots.length,16);assert.ok(p.slots[0]);assert.equal(p.slots[1],null);
});
test("all ten body pieces with parent joints",()=>{
 const ch=core.makeCharacter(0);assert.equal(core.PARTS.length,10);assert.equal(Object.keys(ch.pose).length,10);
 const matrix=core.transforms(ch);assert.equal(Object.keys(matrix).length,10);
});
test("poses change rig without changing shape data",()=>{
 const ch=core.makeCharacter(0);const before=core.transforms(ch).armRU.join(",");
 core.applyPreset(ch,"aceno");assert.notEqual(core.transforms(ch).armRU.join(","),before);
 assert.ok(core.PATHS.head.startsWith("M"));
});
test("JSON roundtrip and rejects incompatible formats",()=>{
 const p=core.freshProject();const output=core.normalize(JSON.parse(JSON.stringify(p)));
 assert.equal(output.slots[0].name,p.slots[0].name);
 assert.throws(()=>core.normalize({format:"v3",slots:[]}));
});
test("rejects untrusted geometry values and escapes names",()=>{
 const p=core.freshProject();p.slots[0].pose.head.rotation=99999;p.slots[0].name='<script>alert(1)</script>';
 const clean=core.normalize(p);assert.equal(clean.slots[0].pose.head.rotation,180);
 assert.ok(!core.renderSVG(clean.slots[0],{editor:true,joints:true}).includes("<script>"));
});
test("renderer supports editor and 9:16 preview",()=>{
 const ch=core.makeCharacter(0);
 assert.ok(core.renderSVG(ch,{preview:true}).includes("1995"));
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
