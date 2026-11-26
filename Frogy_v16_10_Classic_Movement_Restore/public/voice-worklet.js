/* A lightweight two-window pitch shifter for funny frog voices. Not studio-quality. */
class FrogPitch extends AudioWorkletProcessor {
 constructor(options){super();this.buf=new Float32Array(32768);this.idx=0;this.phase=0;this.ratio=options.processorOptions?.ratio||1.3;this.win=Math.floor(sampleRate*.055);this.port.onmessage=e=>{if(e.data?.ratio)this.ratio=Math.max(.65,Math.min(1.55,e.data.ratio));};}
 read(delay){let f=this.idx-delay;while(f<0)f+=this.buf.length;const a=Math.floor(f)%this.buf.length,b=(a+1)%this.buf.length,v=f-Math.floor(f);return this.buf[a]*(1-v)+this.buf[b]*v;}
 process(inputs,outputs){const input=inputs[0]?.[0]||[],output=outputs[0]?.[0];if(!output)return true;
 for(let i=0;i<output.length;i++){this.buf[this.idx]=input[i]||0;const a=this.phase,b=(a+.5)%1,da=this.win*(1.1+a),db=this.win*(1.1+b),w=Math.sin(Math.PI*a)**2;output[i]=.92*(this.read(da)*w+this.read(db)*(1-w));this.phase+=(1-this.ratio)/this.win;if(this.phase<0)this.phase+=1;if(this.phase>=1)this.phase-=1;this.idx=(this.idx+1)%this.buf.length;}
 return true;}
}
registerProcessor('frog-pitch',FrogPitch);
