# WorkerAsModule
Allow to use js worker as a module with async methods

You might define some methods callable on each side, worker and mainPage can call them transparently, the only limit is that those methods are async, so you need to use await or take the result as a Promise

In your main code you put
```
import WorkerAsModule from "./WorkerAsModule.js";

const worker = new WorkerAsModule('myWorker.js',{
  progress:function(progess){
    if(!this._span){
      this._span = document.createElement('span')
      document.body.appendChild(this._span)
    }
    this._span.innerHTML = progess;
  }
});
console.log(await worker.hugeTask())
```

And in myWorker.js
```
import WorkerAsModule from "./WorkerAsModule.js";

const mainPage = new WorkerAsModule(self,{
  hugeTask:hugeTask
})

function hugeTask(){
  for(let i=0;i<1000000000;i++){
    if(i%10000000===0){
      mainPage.progress(i/10000000+'%');
    }
  }
  return '42';
}
```

And it works! the progress of the calculation is updated on the fly
