
const delay=function delay(interval){
    typeof interval === 'number'?null:interval=1000;
    return new Promise(resolve=>{
        setTimeout(()=>{
            resolve()
        },interval)
    })
};


// 1
(function(){
    let upload=document.querySelector('#upload1');
    let upload_inp=upload.querySelector('.upload_inp');
    let upload_button_select=upload.querySelector('.upload_button.select');
    let upload_button_upload=upload.querySelector('.upload_button.upload');
    let upload_tip=upload.querySelector('.upload_tip');
    let upload_list=upload.querySelector('.upload_list');
    let _file=null;


    const changeDisable=(flag)=>{
        if(flag){
            upload_button_select.classList.add('disabled');
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disabled');
        upload_button_upload.classList.remove('loading');
    }

    upload_button_upload.addEventListener('click',function(){
        if(upload_button_select.classList.contains('disabled') || upload_button_select.classList.contains('loading')) return;
        if(!_file){
            alert('请您先选择要上传的文件~~');
            return;
        }

        changeDisable(true);

        let farmData=new FormData();
        farmData.append('file',_file);
        farmData.append('filename',_file.name);
        instance.post('/upload_single',farmData).then(data=>{
            if(1*data.code===0){
                alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
                return;
            }
            return Promise.reject(data.codeText)
        }).catch(reason=>{
            alert('文件上传失败，请您稍后再试~~');
        }).finally(()=>{
            clearHandle();
            changeDisable(false)
        })
    })

    const clearHandle=function(){
        _file=null;
        upload_tip.style.display='block';
        upload_list.style.display='none';
        upload_list.innerHTML='';
    };
    upload_list.addEventListener('click',function(e){
        let ev=e.target;
        if(ev.tagName==='EM'){
            clearHandle();
        }
    })

    upload_inp.addEventListener('change',function(){
        let file=upload_inp.files[0];
        if(!file)return;
        if(!/(PNG|JPG|JPEG)/i.test(file.type)){
            alert('上传的文件只能是 PNG/JPG/JPEG 格式的~~')
            return
        }
        if(file.size>2*1024*1024){
            alert('上传的文件不能超过2MB~~')
            return
        }

        _file=file;

        upload_tip.style.display='none';
        upload_list.style.display='block';
        upload_list.innerHTML=`<li>
            <span>文件：${file.name}</span>
            <span><em>移除</em></span>
        </li>`;
        // console.dir(upload_inp);
    });

    upload_button_select.addEventListener('click',function(){
        if(upload_button_select.classList.contains('disabled') || upload_button_select.classList.contains('loading')) return;
        upload_inp.click();
    })
})();

//2
(function(){
    let upload=document.querySelector('#upload2');
    let upload_inp=upload.querySelector('.upload_inp');
    let upload_button_select=upload.querySelector('.upload_button.select');

    const checkIsDisable=(element)=>{
        let classList=element.classList;
        return classList.contains('disabled') || classList.contains('loading');
    }

    const changeBASE64=(file)=>{
        return new Promise(resolve=>{
            let fileReader=new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload=ev=>{
                resolve(ev.target.result)
            }
        })
    }

    upload_inp.addEventListener('change',async function(){
        let file=upload_inp.files[0];
        let BASE64;
        let data;
        if(!file)return;
        if(file.size>2*1024*1024){
            alert('上传的文件不能超过2MB~~')
            return
        }

        upload_button_select.classList.add('loading');

        BASE64=await changeBASE64(file)
        try {
            data=await instance.post('/upload_single_base64',{
                file:encodeURIComponent(BASE64),
                filename:file.name
            },{
                headers:{
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            if(+data.code===0){
                alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 地址去访问~~`);
                return;
            }
            throw data.codeText;
        } catch (err) {
            alert('很遗憾，文件上传失败，请您稍后再试~~');
        } finally{
            upload_button_select.classList.remove('loading');
        }
    });

    upload_button_select.addEventListener('click',function(){
        if(checkIsDisable(this)) return;
        upload_inp.click();
    })
})();

// 3
(function(){
    let upload=document.querySelector('#upload3');
    let upload_inp=upload.querySelector('.upload_inp');
    let upload_button_select=upload.querySelector('.upload_button.select');
    let upload_button_upload=upload.querySelector('.upload_button.upload');
    let upload_abbre=upload.querySelector('.upload_abbre');
    let upload_abbre_img=upload_abbre.querySelector('img');
    let _file=null;

    const checkIsDisable=(element)=>{
        let classList=element.classList;
        return classList.contains('disabled') || classList.contains('loading');
    }
    
    const changeBASE64=(file)=>{
        return new Promise(resolve=>{
            let fileReader=new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload=ev=>{
                resolve(ev.target.result)
            }
        })
    }
    const changeBuffer=file=>{
        return new Promise(resolve=>{
            let fileReader=new FileReader();
            fileReader.readAsArrayBuffer(file);
            fileReader.onload=ev=>{
                let buffer=ev.target.result;
                let spark=new SparkMD5.ArrayBuffer();
                let HASH;
                let suffix;
                spark.append(buffer);
                HASH=spark.end();
                suffix=/\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
                resolve({
                    buffer,
                    HASH,
                    suffix,
                    filename:`${HASH}.${suffix}`
                })
            }
        })
    }

    const changeDisable=flag=>{
        if(flag){
            upload_button_select.classList.add('disabled');
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disabled');
        upload_button_upload.classList.remove('loading');
    }

    upload_button_upload.addEventListener('click',async function(){
        if(checkIsDisable(this)) return;
        if(!_file){
            alert('请您先选择要上传的文件~~');
            return;
        }
        changeDisable(true);

        let {filename}=await changeBuffer(_file);
        let formData=new FormData();
        formData.append('file',_file);
        formData.append('filename',filename);

        instance.post('/upload_single_name',formData).then(data=>{
            if (+data.code === 0) {
                alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
                return;
            }
            return Promise.reject(data.codeText);
        }).catch(reason=>{
            alert('文件上传失败，请您稍后再试~~');
        }).finally(()=>{
            changeDisable(false);
            upload_abbre.style.display='none';
            upload_abbre_img.src='';
            _file=null;
        })

    })

    upload_inp.addEventListener('change',async function(){
        let file=upload_inp.files[0];
        let BASE64;
        if(!file)return;
        _file=file;
        upload_button_select.classList.add('disabled');
        BASE64=await changeBASE64(file);
        upload_abbre.style.display='block';
        upload_abbre_img.src=BASE64;
        upload_button_select.classList.remove('disabled');
        
    });

    upload_button_select.addEventListener('click',function(){
        if(checkIsDisable(this)) return;
        upload_inp.click();
    })
})();

// 4
(function(){
    let upload=document.querySelector('#upload4');
    let upload_inp=upload.querySelector('.upload_inp');
    let upload_button_select=upload.querySelector('.upload_button.select');
    let upload_progress=upload.querySelector('.upload_progress');
    let upload_progress_value=upload_progress.querySelector('.value');

    const checkIsDisable=(element)=>{
        let classList=element.classList;
        return classList.contains('disabled') || classList.contains('loading');
    }
    
    upload_inp.addEventListener('change',async function(){
        let file=upload_inp.files[0];
        let data;
        if(!file)return;
        upload_button_select.classList.add('loading');
        try {
            let formData=new FormData();
            formData.append('file',file);
            formData.append('filename',file.name);
            data=await instance.post('/upload_single',formData,{
                onUploadProgress(ev){
                    let {loaded,total}=ev;
                    upload_progress.style.display='block';
                    upload_progress_value.style.width=`${(loaded/total)*100}%`
                }
            })
            if(+data.code===0){
                upload_progress_value.style.width='100%';
                await delay(300);
                alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
                return;
            }
            throw data.codeText;
        } catch (err) {
            alert('很遗憾，文件上传失败，请您稍后再试~~');
        } finally{
            upload_button_select.classList.remove('loading');
            upload_progress.style.display='none';
            upload_progress_value.style.width='0';
            data=null;
        }
    });

    upload_button_select.addEventListener('click',function(){
        if(checkIsDisable(this)) return;
        upload_inp.click();
    })
})();

// 5
(function(){
    let upload=document.querySelector('#upload5');
    let upload_inp=upload.querySelector('.upload_inp');
    let upload_button_select=upload.querySelector('.upload_button.select');
    let upload_button_upload=upload.querySelector('.upload_button.upload');
    let upload_list=upload.querySelector('.upload_list');
    let _file=[];

    const checkIsDisable=(element)=>{
        let classList=element.classList;
        return classList.contains('disabled') || classList.contains('loading');
    }

    const createRandom=()=>{
        let ran=Math.random()*new Date();
        return ran.toString(16).replace('.','');
    }

    const changeDisable = flag => {
        if (flag) {
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disable');
        upload_button_upload.classList.remove('loading');
    };

    upload_button_upload.addEventListener('click',function(){
        if(checkIsDisable(this)) return;
        if(_file.length===0){
            alert('请您先选择要上传的文件~~');
            return;
        }
        changeDisable(true);
        let upload_list_arr=Array.from(upload_list.querySelectorAll('li'));
        _file=_file.map(item=>{
            let fm=new FormData();
            let curLi=upload_list_arr.find(liBox=>liBox.getAttribute('key')===item.key);
            let curSpan=curLi?curLi.querySelector('span:nth-last-child(1)'):null;

            fm.append('file',item.file);
            fm.append('filename',item.filename);
            return instance.post('/upload_single',fm,{
                onUploadProgress(ev){
                    let {loaded,total}=ev;
                    if(curSpan){
                        curSpan.innerHTML=`${((loaded/total)*100).toFixed(2)}%`;
                    }
                }
            }).then(data=>{
                if(+data.code===0){
                    if(curSpan){
                        curSpan.innerHTML='100%';
                    }
                    return;
                }
                return Promise.reject();
            })
        })

        Promise.all(_file).then(()=>{
            alert('恭喜您，所有文件都上传成功~~');
        }).catch(()=>{
            alert('很遗憾，上传过程中出现问题，请您稍后再试~~');
        }).finally(()=>{
            changeDisable(false);
            _file=[];
            upload_list.innerHTML='';
            upload_list.style.display='none';
        })
    })

    upload_list.addEventListener('click',function(e){
        let ev=e.target;
        let curLi=null;
        let key;
        if(ev.tagName==='EM'){
            curLi=ev.parentNode.parentNode;//父级节点（li）
            if(!curLi) return;
            upload_list.removeChild(curLi);
            key=curLi.getAttribute('key');
            _file=_file.filter(file=>file.key!==key);
            if(_file.length===0){
                upload_list.style.display='none';
            }
        }
    })
    
    upload_inp.addEventListener('change',async function(){
        _file=Array.from(upload_inp.files);
        if(_file.length===0) return;
        _file=_file.map(file=>{
            return{
                file,
                filename:file.name,
                key:createRandom()
            }
        })
        let str=``;
        _file.forEach((file,index)=>{
            str+=`<li key="${file.key}">
                <span>文件${index+1}：${file.filename}</span>
                <span><em>移除</em></span>
            </li> `;
        })
        upload_list.innerHTML=str;
        upload_list.style.display='block';
        
        
    });

    upload_button_select.addEventListener('click',function(){
        if(checkIsDisable(this)) return;
        upload_inp.click();
    })
})();

//6
(function(){
    let upload=document.querySelector('#upload6');
    let upload_inp=upload.querySelector('.upload_inp');
    let upload_submit=upload.querySelector('.upload_submit');
    let upload_mark=upload.querySelector('.upload_mark');
    let isRun=false;

    upload.addEventListener('drop',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        upload.classList.remove('changeBorder');
        let file=ev.dataTransfer.files[0];
        if(!file) return;
        uploadFile(file);
    })
    // upload.addEventListener('dragenter',function(ev){})
    // upload.addEventListener('dragleave',function(ev){})
    upload.addEventListener('dragover',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        upload.classList.add('changeBorder');
    })

    const uploadFile=async file=>{
        if(isRun) return;
        isRun=true;
        upload_mark.style.display='block';
        try {
            let fm=new FormData();
            let data;
            fm.append('file',file);
            fm.append('filename',file.name);
            data=await instance.post('/upload_single',fm).then(data=>{
                if(+data.code===0){
                    alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
                    return;
                }
                throw data.codeText;
            })
        } catch (err) {
            alert(`很遗憾，文件上传失败，请您稍后再试~~`);
        } finally{
            isRun=false;
            upload_mark.style.display='none';
        }
    }

    upload_inp.addEventListener('change',function(){
        let file=upload_inp.files[0];
        if(!file)return;
        uploadFile(file);
    });

    upload_submit.addEventListener('click',function(){
        upload_inp.click();
    })
})();

//7
(function(){
    let upload=document.querySelector('#upload7');
    let upload_inp=upload.querySelector('.upload_inp');
    let upload_button_select=upload.querySelector('.upload_button.select');
    let upload_progress=upload.querySelector('.upload_progress');
    let upload_progress_value=upload_progress.querySelector('.value');

    const checkIsDisable=(element)=>{
        let classList=element.classList;
        return classList.contains('disabled') || classList.contains('loading');
    }

   const changeBuffer=file=>{
    return new Promise(resolve=>{
        let fileReader=new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload=ev=>{
            let buffer=ev.target.result;
            let spark=new SparkMD5.ArrayBuffer();
            let HASH;
            let suffix;
            spark.append(buffer);
            HASH=spark.end();
            suffix=/\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
            resolve({
                buffer,
                HASH,
                suffix,
                filename:`${HASH}.${suffix}`
            });
        }
    })
   }
    
    upload_inp.addEventListener('change',async function(){
        let file=upload_inp.files[0];
        if(!file) return;
        upload_button_select.classList.add('loading');
        upload_progress.style.display='block';
        let already=[];
        let data=null;
        
        let {HASH,suffix}=await changeBuffer(file);

        try {
            data=await instance.get('/upload_already',{
                params:{
                    HASH
                }
            })
            if(+data.code===0){
                already=data.fileList;
            }
        } catch (err) {
            
        }

        let max=1024*100;
        let count=Math.ceil(file.size/max);
        let index=0;
        let chunks=[];
        if(count>100){
            max=file.size/100;
            count=100;
        }
        while(index<count){
            chunks.push({
                file:file.slice(index*max,(index+1)*max),
                filename:`${HASH}_${index+1}.${suffix}`
            })
            index++;
        }
        index=0;

        const clear=()=>{
            upload_button_select.classList.remove('loading');
            upload_progress.style.display='none';
            upload_progress_value.style.width='0';
        }

        const complate= async()=>{
            index++;
            upload_progress_value.style.width=`${index/count*100}%`;

            if(index<count) return;
            upload_progress_value.style.width='100%';
            try {
                data=await instance.post('/upload_merge',{
                    HASH,
                    count
                },{
                    headers:{
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                if(+data.code===0){
                    alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
                    clear();
                    return;
                }
                throw data.codeText;
            } catch (err) {
                alert('切片合并失败，请您稍后再试~~');
                clear();
            }
        }

        chunks.forEach(chunk=>{
            if(already.length>0 && already.includes(chunk.filename)){
                complate();
                return;
            }

            let fm=new FormData();
            fm.append('file',chunk.file);
            fm.append('filename',chunk.filename);
            instance.post('/upload_chunk',fm).then(data=>{
                if(+data.code===0){
                    complate();
                    return;
                }
                return Promise.reject(data.codeText);
            }).catch(()=>{
                alert('当前切片上传失败，请您稍后再试~~');
                clear();
            })
        })
    });

    upload_button_select.addEventListener('click',function(){
        if(checkIsDisable(this)) return;
        upload_inp.click();
    })
})();