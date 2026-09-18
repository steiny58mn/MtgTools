let _startTime = 0;

export function startTimer() {
    _startTime = Date.now() / 1000;
}

export function getTime() {
    const currentTime = Date.now() / 1000;
    return currentTime - _startTime;
}

export function DownloadFile(data:Blob, fileName:string) {
    const blobUrl = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
}

export async function ReadFile(file:File):Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (event) => resolve (event.target?.result as string);
        reader.onerror = (error) => reject(error);
    })
}

export async function CallApiWithFile(files:File[], apiPath:string, downloadFileName: string) {
    const formData = new FormData();

    for (const file of files) {
        const fileContents = await ReadFile(file);
        formData.append("files", new Blob([fileContents], {type: "application/txt"}), file.name);
    }
    
    await fetch(apiPath,
        {
            method: "POST",
            body: formData,
        })
        .then(res => res.blob())
        .then(data => {
            DownloadFile(data, downloadFileName);           
            console.log(`Process took ${(getTime()).toFixed(2)} seconds`);
        })
        .catch(error => {
            // Handle any error that occurred in the chain
            console.error('Error:', error);
        });
}

export async function testApiWithModel(apiPath:string, model:string) {
    await fetch(apiPath,
        {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: model,
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                alert(data.message);
                console.log(`Process took ${(getTime()).toFixed(2)} seconds`);
            }
            else {
                alert("Testing failed status");
            }
        })
        .catch(error => {
            // Handle any error that occurred in the chain
            console.error('Error:', error);
        });
}
