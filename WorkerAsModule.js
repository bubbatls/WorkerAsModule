class WorkerAsModule{
  constructor(workerPath,handlerByType){
    var 
      worker,
      //keep object like {resolve, reject, error} for running promise
      promiseStack = [];
    
    if(typeof workerPath==='string'){
      worker = new Worker(workerPath,{type:"module"});
    }else if(workerPath instanceof Worker){
      worker = workerPath;
    }else{
      worker = self;
    }
    
    worker.onmessage = async (event)=>{
      let 
        type = event.data[0],
        id = event.data[1],
        subtype = event.data[2],
        params = event.data[3];
      
      if(type==="request"){
        //we receive a request
        try{
          //get the handler and use it
          let 
            method = handlerByType[subtype];
          if(method===undefined){
            throw new Error('no method of name '+subtype)
          }  
          //then post the result
          worker.postMessage(["response",id,subtype,await method.apply(handlerByType,params)]);
        }catch(error){
          //or post the error
          worker.postMessage(["responseerror",id,subtype,error]);
        }
      }else if(type==="response"){
        //we get a response, so get initial promise and resolve it
        let 
          promise = promiseStack[id];
        promiseStack[id] = null;
        promise.resolve(params);
      }else if(type==="responseerror"){
        //we get a response, so get initial promise and reject it with cumulation of stacktace from the other side
        let 
          promise = promiseStack[id],
          returnedError = params;
        
        promiseStack[id] = null;
        returnedError.stack+='\r\n'+promise.error.stack;
        promise.reject(returnedError);
      }
    }
    //FIXME maybe we enter here if a call without await was done and causes error, TODO test and fix
    worker.onerror = (event)=>{
      console.log('worker.onerror',event)
      promiseStack.forEach(o=>o.reject(event));
    }
    
    return new Proxy(this,{
      get(target, name) {
        var 
          context = {},
          method = async function(){
            var 
              id = promiseStack.length,
              params = ["request",id,name,Array.prototype.slice.apply(arguments,[0])],//we slice arguments to have a simple Array
              error = new Error();
            return new Promise((resolve, reject)=>{
              promiseStack.push({resolve, reject, error})    
              worker.postMessage(params,context.transferable?context.transferable:[]);
            });
          },
          result = function(){
            return method.apply(context,arguments)
          };
          
        result.transfer=function(){
          context.transferable = arguments;
          return result;
        }
        return result
      }
    })
    
  }
}

export default WorkerAsModule;