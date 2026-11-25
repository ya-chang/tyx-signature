import type {VariantInk,MotionGeometry} from './motion-variants';
import {appendCapsules} from './brush-engine';
import {drawInkRibbonOutro} from './ink-ribbon-outro';
import {openingSubjectColors,type OutroAppearance} from './motion-palette';

export type AuthoredOutroPreset='vortex'|'petal-close'|'sweep-away'|'bloom-fade'|'ripple-out'|'starburst'|'wind-drift'|'ink-splash'|'crystal-shatter'|'mirror-flip'|'aurora-fade'|'cascade-drop'|'prism-shatter'|'echo-loop'|'dawn-rise';
export type OutroBeat={progress:number;collapse:number;sourceScale:number;spread:number;fade:number;phase:'collapse'|'point'|'expand'|'gather'|'fade'};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const u=clamp(n);return u*u*(3-2*u);};
const hexToRgba=(hex:string,alpha:number):string=>{
  const h=hex.replace('#','');
  const full=h.length===3?h.split('').map(c=>c+c).join(''):h;
  const n=parseInt(full,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
};

/** Compatibility clock for companions of the retained classic exit. Authored scenes own their clocks. */
export function outroBeat(progress:number):OutroBeat{
  const p=clamp(Number.isFinite(progress)?progress:0),collapse=ease(p/.28),sourceScale=1-collapse;
  const spread=p<=.33?0:p<.66?ease((p-.33)/.33):1-ease((p-.66)/.26),fade=p<=.92?1:1-ease((p-.92)/.08);
  const phase:OutroBeat['phase']=p<.28?'collapse':p<.33?'point':p<.66?'expand':p<.92?'gather':'fade';
  return {progress:p,collapse,sourceScale,spread,fade,phase};
}

/** 光瓣收拢：先向心收缩，再按径向散成光瓣向外飘散退场。 */
function drawPetalCloseOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const contract=ease(Math.min(1,p/.30));
  const scatter=clamp((p-.30)/.70);
  const fade=1-ease(Math.max(0,(p-.70)/.30));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dx=s.x-cx,dy=s.y-cy,len=Math.hypot(dx,dy)||1,nx=dx/len,ny=dy/len;
      const pull=1-contract*.45,push=scatter*radius*(.30+.70*s.u);
      out.push({x:cx+dx*pull+nx*push,y:cy+dy*pull+ny*push,radius:Math.max(.05,s.radius*(1-scatter*.72)*(1-contract*.25)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  ctx.restore();
}

/** 流光扫散：对角光带扫过，墨迹随光带方向化作光点飘散。 */
function drawSweepAwayOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const sweep=ease(p/.55),dissolve=clamp((p-.16)/.60),fade=1-ease(Math.max(0,(p-.82)/.18));
  if(fade<=.002)return;
  const ax=Math.cos(-Math.PI/4),ay=Math.sin(-Math.PI/4);
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const t=((s.x-cx)*ax+(s.y-cy)*ay)/radius;
      const d=clamp((t-(sweep*2.1-1.05))/.9)*dissolve,drift=d*radius*.95;
      out.push({x:s.x+ax*drift+(s.x-cx)*d*.10,y:s.y+ay*drift-Math.abs(s.x-cx)*d*.06,radius:Math.max(.05,s.radius*(1-d*.8)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade*(1-clamp((p-.55)/.35)*.65);ctx.fill(path);
  }
  // 光带本体：沿对角线移动的柔光，用 lighter 叠加出流光感
  if(p<.9){
    const band=radius*.95,pos=sweep*radius*2.2-radius,alpha=.34*(1-ease((p-.7)/.25));
    if(alpha>.004){
      ctx.save();ctx.globalCompositeOperation='lighter';
      ctx.translate(cx+ax*pos,cy+ay*pos);ctx.rotate(-Math.PI/4);
      const grad=ctx.createLinearGradient(-band,0,band,0);
      grad.addColorStop(0,'rgba(0,0,0,0)');
      grad.addColorStop(.5,hexToRgba(colors[0]??'#ffffff',alpha));
      grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grad;
      ctx.beginPath();ctx.ellipse(0,0,band,band*.22,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/** 绽放消散：墨迹从中心绽放成多层花瓣，逐层透明消散退场。 */
function drawBloomFadeOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const bloom=ease(Math.min(1,p/.40));
  const fade=1-ease(Math.max(0,(p-.55)/.45));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dx=s.x-cx,dy=s.y-cy,len=Math.hypot(dx,dy)||1,nx=dx/len,ny=dy/len;
      const push=bloom*radius*(.25+.75*s.u);
      const twist=bloom*Math.PI*.3*s.u;
      const px=cx+dx+nx*push*Math.cos(twist)-ny*push*Math.sin(twist);
      const py=cy+dy+nx*push*Math.sin(twist)+ny*push*Math.cos(twist);
      out.push({x:px,y:py,radius:Math.max(.05,s.radius*(1-bloom*.55)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  ctx.restore();
}

/** 涟漪扩散：墨迹化作同心涟漪向外扩散，逐渐淡出消失。 */
function drawRippleOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const ripple=ease(Math.min(1,p/.60));
  const fade=1-ease(Math.max(0,(p-.65)/.35));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dx=s.x-cx,dy=s.y-cy,len=Math.hypot(dx,dy)||1;
      const push=ripple*radius*1.2*(.3+.7*s.u);
      const wave=Math.sin(len/radius*Math.PI*4+p*Math.PI*6)*.15;
      out.push({x:cx+dx+dx/len*push*(1+wave),y:cy+dy+dy/len*push*(1+wave),radius:Math.max(.05,s.radius*(1-ripple*.7)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  ctx.restore();
}

/** 星芒迸发：墨迹从中心迸发出星芒射线，光芒散尽后退场。 */
function drawStarburstOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const burst=ease(Math.min(1,p/.35));
  const fade=1-ease(Math.max(0,(p-.65)/.35));
  if(fade<=.002)return;
  const rays=8;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dx=s.x-cx,dy=s.y-cy,len=Math.hypot(dx,dy)||1;
      const angle=Math.atan2(dy,dx);
      const rayIdx=Math.round((angle+Math.PI)/ (Math.PI*2/rays))%rays;
      const rayOffset=(rayIdx/rays-.5)*Math.PI*2;
      const push=burst*radius*(.4+.6*Math.abs(Math.cos(angle-rayOffset)));
      out.push({x:cx+dx+dx/len*push,y:cy+dy+dy/len*push,radius:Math.max(.05,s.radius*(1-burst*.6)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  // 星芒射线叠加
  if(burst>.1){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<rays;i++){
      const a=i/rays*Math.PI*2;
      const len=radius*burst*1.3;
      ctx.strokeStyle=hexToRgba(colors[0]??'#ffffff',fade*.25);
      ctx.lineWidth=radius*.04;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*len,cy+Math.sin(a)*len);ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 风中飘散：墨迹被风吹散成细碎光点，随风飘向远方退场。 */
function drawWindDriftOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const drift=ease(Math.min(1,p/.70));
  const fade=1-ease(Math.max(0,(p-.75)/.25));
  if(fade<=.002)return;
  const ax=1,ay=-.35;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const spread=drift*radius*(.5+1.2*s.u);
      const wobble=Math.sin(s.u*Math.PI*6+p*Math.PI*4)*radius*.08*drift;
      out.push({x:s.x+ax*spread+wobble,y:s.y+ay*spread-Math.abs(s.x-cx)*drift*.04,radius:Math.max(.03,s.radius*(1-drift*.85)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  ctx.restore();
}

/** 墨溅收束：墨迹向四周溅开成墨点，随后聚拢收束消失。 */
function drawInkSplashOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const splash=p<.40?ease(p/.40):1-ease((p-.40)/.40);
  const fade=1-ease(Math.max(0,(p-.80)/.20));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dx=s.x-cx,dy=s.y-cy,len=Math.hypot(dx,dy)||1;
      const push=splash*radius*(.3+.7*s.u);
      const noise=Math.sin(s.u*Math.PI*8)*radius*.05*splash;
      out.push({x:cx+dx+dx/len*push+noise,y:cy+dy+dy/len*push,radius:Math.max(.04,s.radius*(1-splash*.4)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  ctx.restore();
}

/** 晶碎退场：墨迹凝结成晶体后碎裂成光屑，缓缓飘落退场。 */
function drawCrystalShatterOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const condense=ease(Math.min(1,p/.25));
  const shatter=clamp((p-.25)/.40);
  const fade=1-ease(Math.max(0,(p-.70)/.30));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dx=s.x-cx,dy=s.y-cy,len=Math.hypot(dx,dy)||1;
      const pull=1-condense*.3;
      const fall=shatter*radius*1.5*(.3+.7*s.u);
      const spread=shatter*radius*.3*(1-s.u);
      out.push({x:cx+dx*pull+dx/len*spread,y:cy+dy*pull+fall,radius:Math.max(.03,s.radius*(1-shatter*.8)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  ctx.restore();
}


/** 镜面翻转：签名沿水平轴翻转，镜像淡出退场。 */
function drawMirrorFlipOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const flip=ease(Math.min(1,p/.50));
  const fade=1-ease(Math.max(0,(p-.60)/.40));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dy=s.y-cy,mirrorY=cy-dy*flip;
      const spread=flip*radius*.15*s.u;
      out.push({x:s.x+spread*Math.sin(s.u*Math.PI*3),y:mirrorY,radius:Math.max(.05,s.radius*(1-flip*.5)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  ctx.restore();
}

/** 极光消散：极光带横向扫过，墨迹随极光扭曲后消散。 */
function drawAuroraFadeOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const sweep=ease(Math.min(1,p/.60));
  const fade=1-ease(Math.max(0,(p-.65)/.35));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const wave=Math.sin((s.x-cx)/radius*Math.PI*3+sweep*Math.PI*4)*radius*.12*sweep;
      const drift=(s.x-cx)/radius*sweep*radius*.2;
      out.push({x:s.x+drift,y:s.y+wave,radius:Math.max(.04,s.radius*(1-sweep*.6)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  if(sweep>.1){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let band=0;band<3;band++){
      const grad=ctx.createLinearGradient(cx-radius,cy,cx+radius,cy);
      const col=colors[band%colors.length]??'#ffffff';
      grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(.5,hexToRgba(col,fade*.18*(1-band*.2)));grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grad;ctx.fillRect(cx-radius,cy-radius*.3,radius*2,radius*.6);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 瀑布坠落：墨迹化作水滴向下坠落，逐渐消散。 */
function drawCascadeDropOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const drop=ease(Math.min(1,p/.65));
  const fade=1-ease(Math.max(0,(p-.70)/.30));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const fall=drop*radius*2.0*(.3+.7*s.u);
      const wobble=Math.sin(s.u*Math.PI*5+drop*Math.PI*3)*radius*.06;
      out.push({x:s.x+wobble,y:s.y+fall,radius:Math.max(.03,s.radius*(1-drop*.75)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  ctx.restore();
}

/** 棱镜碎裂：墨迹凝结成棱镜后碎裂成彩色碎片飞散。 */
function drawPrismShatterOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const condense=ease(Math.min(1,p/.20));
  const shatter=clamp((p-.20)/.50);
  const fade=1-ease(Math.max(0,(p-.75)/.25));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dx=s.x-cx,dy=s.y-cy,len=Math.hypot(dx,dy)||1;
      const pull=1-condense*.25;
      const angle=Math.atan2(dy,dx)+shatter*Math.PI*2;
      const push=shatter*radius*(.5+1.5*s.u);
      out.push({x:cx+dx*pull+Math.cos(angle)*push,y:cy+dy*pull+Math.sin(angle)*push,radius:Math.max(.03,s.radius*(1-shatter*.8)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  if(shatter>.1){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2+shatter*Math.PI;
      const r=radius*shatter*1.2;
      ctx.fillStyle=hexToRgba(colors[i%colors.length]??'#ffffff',fade*.12);
      ctx.beginPath();ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,radius*.15,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 回声环绕：墨迹化作回声波纹向外扩散，层层淡出。 */
function drawEchoLoopOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const ripple=ease(Math.min(1,p/.70));
  const fade=1-ease(Math.max(0,(p-.75)/.25));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const dx=s.x-cx,dy=s.y-cy,len=Math.hypot(dx,dy)||1;
      const ring=Math.sin(len/radius*Math.PI*2-ripple*Math.PI*4)*radius*.15*ripple;
      const push=ripple*radius*.3*(1-s.u);
      out.push({x:cx+dx+dx/len*(push+ring),y:cy+dy+dy/len*(push+ring),radius:Math.max(.04,s.radius*(1-ripple*.6)),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  // 回声环
  if(ripple>.1){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let ring=0;ring<3;ring++){
      const r=radius*ripple*(.4+ring*.3);
      ctx.strokeStyle=hexToRgba(colors[0]??'#ffffff',fade*.15*(1-ring*.2));
      ctx.lineWidth=radius*.03;
      ctx.beginPath();ctx.arc(cx,cy,Math.max(1,r),0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 晨光升腾：墨迹向上飘升成光点，如晨光中消散。 */
function drawDawnRiseOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,colors:readonly string[]):void{
  if(!inks.some(ink=>ink.samples.length))return;
  const cx=g.center.x,cy=g.center.y,radius=Math.max(1,g.radius);
  const rise=ease(Math.min(1,p/.65));
  const fade=1-ease(Math.max(0,(p-.70)/.30));
  if(fade<=.002)return;
  ctx.save();ctx.globalAlpha=fade;
  for(const ink of inks){
    if(!ink.samples.length)continue;
    const path=new Path2D(),out=[];
    for(const s of ink.samples){
      const lift=rise*radius*2.2*(.2+.8*s.u);
      const drift=Math.sin(s.u*Math.PI*4+rise*Math.PI*3)*radius*.1;
      const shrink=1-rise*.7;
      out.push({x:s.x+drift,y:s.y-lift,radius:Math.max(.03,s.radius*shrink),u:s.u});
    }
    appendCapsules(path,out);
    ctx.fillStyle=ink.color;
    if(ink.glowStrength>0){ctx.save();ctx.shadowColor=ink.glowColor;ctx.shadowBlur=ink.glowRadius;ctx.globalAlpha=fade*ink.glowStrength*.5;ctx.fill(path);ctx.restore();}
    ctx.globalAlpha=fade;ctx.fill(path);
  }
  // 晨光渐变
  if(rise>.1){
    ctx.save();ctx.globalCompositeOperation='lighter';
    const grad=ctx.createLinearGradient(cx,cy-radius*2,cx,cy+radius);
    grad.addColorStop(0,hexToRgba(colors[0]??'#ffffff',fade*.12*rise));
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grad;ctx.fillRect(cx-radius,cy-radius*2,radius*2,radius*3);
    ctx.restore();
  }
  ctx.restore();
}

/** The retained authored ending keeps its existing seven flights and entry artwork. */
export function drawAuthoredOutroInk(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],id:AuthoredOutroPreset,progress:number,geometry:MotionGeometry,colors:readonly string[]=openingSubjectColors('classic'),appearance?:OutroAppearance):void{
  const p=clamp(Number.isFinite(progress)?progress:0);if(p>=1)return;
  if(id==='vortex'){drawInkRibbonOutro(ctx,inks,p,geometry,colors,appearance);return;}
  if(id==='petal-close'){drawPetalCloseOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='sweep-away'){drawSweepAwayOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='bloom-fade'){drawBloomFadeOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='ripple-out'){drawRippleOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='starburst'){drawStarburstOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='wind-drift'){drawWindDriftOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='ink-splash'){drawInkSplashOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='crystal-shatter'){drawCrystalShatterOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='mirror-flip'){drawMirrorFlipOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='aurora-fade'){drawAuroraFadeOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='cascade-drop'){drawCascadeDropOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='prism-shatter'){drawPrismShatterOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='echo-loop'){drawEchoLoopOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='dawn-rise'){drawDawnRiseOutro(ctx,inks,p,geometry,colors);return;}
}
