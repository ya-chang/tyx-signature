import type {VariantInk,MotionGeometry} from './motion-variants';
import {appendCapsules} from './brush-engine';
import {drawInkRibbonOutro} from './ink-ribbon-outro';
import {openingSubjectColors,type OutroAppearance} from './motion-palette';

export type AuthoredOutroPreset='vortex'|'petal-close'|'sweep-away';
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

/** The retained authored ending keeps its existing seven flights and entry artwork. */
export function drawAuthoredOutroInk(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],id:AuthoredOutroPreset,progress:number,geometry:MotionGeometry,colors:readonly string[]=openingSubjectColors('classic'),appearance?:OutroAppearance):void{
  const p=clamp(Number.isFinite(progress)?progress:0);if(p>=1)return;
  if(id==='vortex'){drawInkRibbonOutro(ctx,inks,p,geometry,colors,appearance);return;}
  if(id==='petal-close'){drawPetalCloseOutro(ctx,inks,p,geometry,colors);return;}
  if(id==='sweep-away'){drawSweepAwayOutro(ctx,inks,p,geometry,colors);return;}
}
