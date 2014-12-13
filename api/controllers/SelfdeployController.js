/**
 * SelfdeployController
 *
 * @description :: Server-side logic for managing selfdeploys
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var sys = require('sys')
var spawn = require('child_process').spawn;
var self_deploy={start:0,end:0,proc:null,log:'',socks:{},
    update:function(msg){
        console.log('selfdeploy: '+msg);
        self_deploy.log+=msg;
        for(id in self_deploy.socks){
           self_deploy.socks[id].emit('selfdeploy-update',msg);
        }
    },
    clear:function(){
    self_deploy.log='';
    }
};
module.exports = {
    requestStatus:function(sock,data){
        if(data!='passcode')
        {
            //sock.emit('selfdeploy-response','invalid passcode');
            return 'invalid passcode';
        }
        console.log(sock.id);
        self_deploy.socks[sock.id]=sock;
        console.log("selfdeploy status monitor #"+Object.keys(self_deploy.socks).length);
        sock.emit('selfdeploy-update',self_deploy.log);
        sock.on('disconnect',function(){
            console.log('disconnected');
            delete self_deploy.socks[sock.id];
        });
        return 'success';
    },
    status: function(req,res){
        res.view('selfdeploystatus');
    },
	index: function (req,res){
        self_deploy.clear();
        self_deploy.update('Self deployment invoked at '+(new Date().toString())+'\n');
        res.send("Deployment started at "+(new Date().toString())+".\nSee status at /selfdeploy/status.");
        if(self_deploy.proc!=null){
            self_deploy.update('Previous deployment still incomplete. Killing it and continuing deployment.\n');
            self_deploy.proc.kill();
            while(self_deploy.proc!=null);//wait for previous shit to end!
        }
        self_deploy.start=new Date().getTime();
        (function(){
            var child = spawn("sh",["deploy.sh"]);

            child.stdout.on('data',function (data) {
                if(self_deploy.proc!=null && self_deploy.proc.pid!=child.pid){
                   return;
                }

                self_deploy.update(data+'');
            });
            child.stderr.on('data',function (data) {
                if(self_deploy.proc!=null && self_deploy.proc.pid!=child.pid){
                   return;
                }
                self_deploy.update(data);
            });
            child.on('error',function(err){
                self_deploy.update('Error:'+err);
            });
            child.on('close',function (code) {
                if(self_deploy.proc!=null && self_deploy.proc.pid!=child.pid){
                   self_deploy.update('Previous deploy script killed. Ignoring its state.\n');
                    return;
                }
                self_deploy.proc=null;
                self_deploy.end=new Date().getTime();
                self_deploy.update('Finished at '+(new Date().toString())+'; took '+((self_deploy.end-self_deploy.start)/1000)+' sec\n');
                self_deploy.update('exitcode:' + code+'\n\n');
            });
            self_deploy.proc=child;
        })();
    }
};

