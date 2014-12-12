/**
 * SelfdeployController
 *
 * @description :: Server-side logic for managing selfdeploys
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var sys = require('sys')
var exec = require('child_process').exec;
var self_deploy={start:0,end:0,proc:null,stdout:'',stderr:'',error:null,log:'',
    update:function(msg){
    console.log('selfdeploy: '+msg);
    self_deploy.log+=msg+'\n';
    },
    clear:function(){
    self_deploy.log='';
    }
};
module.exports = {
    status: function (req,res){
        var status={
            'start':self_deploy.start,
            'end':self_deploy.end,
            'stdout':self_deploy.stdout,
            'stderr':self_deploy.stderr,
            'error':self_deploy.error
        };
        res.write(JSON.stringify(status));
        res.write('log\n'+self_deploy.log);
        res.end();
    },
	index: function (req,res){
        self_deploy.clear();
        self_deploy.update('Self deployment invoked at '+(new Date().toString()));
        res.write("Deployment started at "+(new Date().toString())+".\nSee status at /selfdeploy/status.");
        res.end();
        if(self_deploy.proc!=null){
            self_deploy.update('Previous deployment still incomplete. Killing it and continuing deployment.');
            self_deploy.proc.kill();
        }
        self_deploy.start=new Date().getTime();
        (function(){
            var child = exec("pwd && sh deploy.sh", function (error, stdout, stderr) {
                if(self_deploy.proc!=null && self_deploy.proc.pid!=child.pid){
                   self_deploy.update('Previous deploy script killed. Ignoring its state.');
                    return;
                }

                self_deploy.proc=null;
                self_deploy.end=new Date().getTime();
                self_deploy.stdout=stdout;
                self_deploy.stderr=stderr;
                self_deploy.error=error;

                self_deploy.update('stdout:\n' + stdout);
                self_deploy.update('stderr:\n' + stderr);

                if (error !== null) {
                    self_deploy.update('exitstate:\n' + error);
                }
            });
            self_deploy.proc=child;
        })();
    }
};

