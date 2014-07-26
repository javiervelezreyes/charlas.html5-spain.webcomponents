var express = require ('express');
var app     = express ();
var server  = require ('http').createServer (app);
var Bus     = require ('./public/lib/bus/bus').server (server);

app.use (express.static (__dirname + '/public')); 
server.listen (3000);