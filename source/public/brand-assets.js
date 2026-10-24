export function drawBrandLogo(ctx,logo,x,y,maxWidth,maxHeight){
 const width=logo?.naturalWidth||logo?.width,height=logo?.naturalHeight||logo?.height;
 if(!width||!height)throw Error('Não foi possível carregar a logo Atlas.');
 const scale=Math.min(maxWidth/width,maxHeight/height),w=width*scale,h=height*scale;
 ctx.drawImage(logo,x,y,w,h);return {x,y,width:w,height:h};
}
