// Gradient is a property of the garment's background, never a graphic layer.
export const GRADIENT_ANGLES=Object.freeze([0,90,180,270]);
export function isShirtFillPanel(panel){return panel?.piece==='shirt'&&!panel.trim;}
export function paintPanelBackground(ctx,panel,w,h){
 if(!isShirtFillPanel(panel)||!panel.gradient){ctx.fillStyle=panel.color;ctx.fillRect(0,0,w,h);return;}
 const angle=(Number(panel.gradient.angle)||0)*Math.PI/180;
 const dx=Math.cos(angle),dy=Math.sin(angle);
 const reach=(Math.abs(dx)*w+Math.abs(dy)*h)/2;
 const grad=ctx.createLinearGradient(w/2-reach*dx,h/2-reach*dy,w/2+reach*dx,h/2+reach*dy);
 grad.addColorStop(0,panel.color);grad.addColorStop(1,panel.gradient.toColor);
 ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
}
