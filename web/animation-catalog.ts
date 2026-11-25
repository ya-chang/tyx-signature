import {newOrnatePresets} from './ornate-types';

export const introPresets = [
  {id:'classic',label:'原版气泡流光',description:'气泡与光弧汇入起笔，流光伴随书写。'},
  {id:'comet',label:'流星落笔',description:'彗星拖着宽长光带划入，转弯减速后接成真实笔迹。'},
  {id:'orbit',label:'星环聚光',description:'多层星轨展开，随后流光滴与卫星晶体沿签名运动。'},
  {id:'bloom',label:'光点绽放',description:'双层晶瓣展开，随后单片晶瓣绕着字迹穿行。'},
  ...newOrnatePresets.map(preset=>({id:preset.id,label:preset.label,description:preset.description})),
  {id:'none',label:'无动画',description:'直接开始书写。'},
] as const;

export const outroPresets = [
  {id:'classic',label:'原版彩片收尾',description:'签名与装饰一起变形成彩色笔片。'},
  {id:'vortex',label:'旋涡收拢',description:'沿用开场配色，墨带错峰转弯、回穿交叠，最后收束退场。'},
  {id:'petal-close',label:'光瓣收拢',description:'墨迹先向心收拢，再散成光瓣向外飘散退场。'},
  {id:'sweep-away',label:'流光扫散',description:'一道流光斜向扫过，墨迹化作光点随光带飘散。'},
  {id:'bloom-fade',label:'绽放消散',description:'墨迹从中心绽放成多层花瓣，逐层透明消散退场。'},
  {id:'ripple-out',label:'涟漪扩散',description:'墨迹化作同心涟漪向外扩散，逐渐淡出消失。'},
  {id:'starburst',label:'星芒迸发',description:'墨迹从中心迸发出星芒射线，光芒散尽后退场。'},
  {id:'wind-drift',label:'风中飘散',description:'墨迹被风吹散成细碎光点，随风飘向远方退场。'},
  {id:'ink-splash',label:'墨溅收束',description:'墨迹向四周溅开成墨点，随后聚拢收束消失。'},
  {id:'crystal-shatter',label:'晶碎退场',description:'墨迹凝结成晶体后碎裂成光屑，缓缓飘落退场。'},
  {id:'mirror-flip',label:'镜面翻转',description:'签名沿水平轴翻转成镜像，逐渐扭曲淡出退场。'},
  {id:'aurora-fade',label:'极光消散',description:'极光带横向扫过，墨迹随极光波纹扭曲后消散。'},
  {id:'cascade-drop',label:'瀑布坠落',description:'墨迹化作水滴向下坠落，如瀑布般消散退场。'},
  {id:'prism-shatter',label:'棱镜碎裂',description:'墨迹凝结成棱镜后碎裂成彩色碎片，四散飞溅退场。'},
  {id:'echo-loop',label:'回声环绕',description:'墨迹化作回声波纹层层向外扩散，逐渐淡出消失。'},
  {id:'dawn-rise',label:'晨光升腾',description:'墨迹向上飘升成光点，如晨光中缓缓消散退场。'},
  {id:'none',label:'无动画',description:'写完后保留签名。'},
] as const;

export type IntroPreset = typeof introPresets[number]['id'];
export type OutroPreset = typeof outroPresets[number]['id'];
export type MotionSelection = {intro:IntroPreset;outro:OutroPreset};

/** Keep the old switch authoritative when reading an existing saved design. */
export function resolveMotionSelection(animation:{introOutroEnabled:boolean;intro?:IntroPreset;outro?:OutroPreset}):MotionSelection{
  return animation.introOutroEnabled
    ? {intro:animation.intro??'classic',outro:outroPresets.find(preset=>preset.id===animation.outro)?.id??'classic'}
    : {intro:'none',outro:'none'};
}
