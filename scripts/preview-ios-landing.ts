// Local, read-only visual preview of the exact public SSR document. No DB or auth.
import express from 'express';
import {renderIosAppPage} from '../server/ssr/iosApp';
const app=express();
app.get(['/ios-app','/ios-app/privacy'],(req,res)=>res.type('html').send(renderIosAppPage(req.path==='/ios-app/privacy')));
app.use(express.static('client/public'));
app.listen(4175,'127.0.0.1',()=>console.log('Native app landing preview: http://127.0.0.1:4175/ios-app'));
