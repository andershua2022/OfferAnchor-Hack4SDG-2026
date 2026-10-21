import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({absWorkingDir:root,entryPoints:['frontend/workspace/pdf-local.ts'],outfile:'public/workspace/assets/pdf-local.js',bundle:true,format:'iife',platform:'browser',target:['chrome120','safari17'],loader:{'.mjs':'text'},plugins:[{name:'pdf-core-as-module',setup(builder){builder.onLoad({filter:/[/\\]pdf\.mjs$/},async args=>({contents:await(await import('node:fs/promises')).readFile(args.path,'utf8'),loader:'js'}));}}],legalComments:'inline'});
console.log('Built the pinned local PDF reader with bounded optional scanned-page rendering.');
