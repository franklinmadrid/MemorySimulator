//When document(index.html) is ready run this code
$(document).ready(function() {
    //Hides tables and options if not relevant
    if($('#partitionType').val() == 'Fixed') {
        $('#dynamicTable').hide();
    }
    $('#partitionType').change((e) =>{

        if($('#partitionType').val() == 'Fixed'){
            $('#dynamicTable').hide();
            $('#partitions').show();
            $('#fixedTable').show();
        }else{
            $('#partitions').hide();
            $('#fixedTable').hide();
            $('#dynamicTable').show();
        }
    });
    //initialize global variables
    let memSize;
    let memSizeAllowed;
    let startingAddress;
    let aScheme;
    let pType;
    let partitions = [];
    let dPartitions = [];
    let jobQueue = [];
    let jobs = [];
    let jobID = 0;
    let totalFrag = 0;
    let nextFitCursor=0;

    //on click of GO it will assign input values to variables
    $('#goBtn').click((e)=>{
        e.preventDefault()
        memSize = $("#memorySize").val();
        startingAddress = $("#startingAddress").val();
        aScheme = $("#allocationScheme").val();
        pType = $("#partitionType").val();
        memSizeAllowed = Number(memSize);
        if(pType == "Dynamic"){
            let entry = new partitionEntry(memSize,startingAddress,null,'free');
            dPartitions.push(entry);
            updateDPartitionTable();
        }

    });
    //resets application
    $('#resetBtn').click((e)=>{
        window.location.reload();
    });
    //on click of add button for partition will trigger code below
    $('#addPartitionBtn').click((e)=>{
        e.preventDefault()
        //adds partition to partition array or alerts user if too big to initialize partition
        let partitionSize = Number($("#partitionSize").val());
        if(partitions.length == 0 && memSizeAllowed >= partitionSize ){
            let entry = new partitionEntry(partitionSize,startingAddress,null,"free")
            partitions.push(entry)
            updateFPartitionTable();
            $("#bar").remove();
            createBar();
            memSizeAllowed = memSizeAllowed - partitionSize;

        }else if(memSizeAllowed >= partitionSize){
            let newAddress= partitions[partitions.length - 1].memAddress + partitions[partitions.length - 1].pSize;
            let entry = new partitionEntry(partitionSize,newAddress,null,"free");
            partitions.push(entry);
            updateFPartitionTable();
            $("#bar").remove();
            createBar();
            memSizeAllowed = memSizeAllowed - partitionSize;
        }else{
            alert("partition is too big")
        }
        console.log(partitions,memSizeAllowed,partitionSize);
    });

    //on click of add button for jobs will trigger code below.
    //if job is bigger than biggest partition possible will alert user.
    $("#addJobBtn").click((e)=>{
        e.preventDefault()
        let jobSize = Number($("#jobSize").val());
        let job = new Job(jobSize,jobID);
        let maxPartition = 0;
        let maxPos = -1;
        //checks and finds max partition and value
        partitions.forEach(element => {
            if (element.pSize > maxPartition) {
                maxPartition = element.pSize;
                maxPos = partitions.indexOf(element);
            }
        });
        //if dynamic partition will use dynamic arrays and functions and vice versa for fixed partition
        if(jobSize <= memSize && pType == "Dynamic"){
            //if job could not be added will send to job queue.
            if(!addDynamicArray(dPartitions,job,aScheme)){
                jobQueue.push(job);
                addJobQTable(job.jobSize,job.jobID);
                jobID++;
            }else{
                //job has been added to partition
                //updates partition table and svg image
                updateDPartitionTable();
                $("#bar").remove();
                createBar();
                //clones svg and records to logs
                let input = "<p> job " +  jobID + " arrives</p>"
                $(input).appendTo($('#snapshotLogs'));
                $('#snapshot > svg').clone().appendTo($('#snapshotLogs'));
                jobID++;

            }
        }else if(jobSize <= maxPartition && pType == "Fixed"){
            if(!addFixedArray(partitions,job,aScheme)){
                jobQueue.push(job);
                addJobQTable(job.jobSize,job.jobID);
                jobID++;
            }else{
                updateFPartitionTable();
                updateTotalFrag();
                $("#bar").remove();
                createBar();
                //clones svg and records to logs
                let input = "<p> job " +  jobID + " arrives</p>"
                $(input).appendTo($('#snapshotLogs'));
                $('#snapshot > svg').clone().appendTo($('#snapshotLogs'));
                jobID++;
            }
        }else{
            alert("Job is too big to load to system")
        }
    });
        
    //on click of remove button triggers code below
    $("#removeJobBtn").click((e)=>{
        e.preventDefault();
        let jobID = $("#removeJobList").val();
        removeJob(jobID); //removes jobID and updates various things
        updateTotalFrag();
        //updates proper table 
        if(pType == 'Fixed'){
            updateFPartitionTable();
        }else{
            updateDPartitionTable();
        }
        //updates svg image
        $("#bar").remove();
        createBar();
        //clones svg and records to logs
        let input = "<p> job " +  jobID + " leaves</p>"
        $(input).appendTo($('#snapshotLogs'));
        $('#snapshot > svg').clone().appendTo($('#snapshotLogs'));
    });

    //adds job to queue table
    function addJobQTable(jobSize,jobID){
        $("#tbodyQueue").append('<tr id='+ jobID +'><td>' + jobSize + '</td><td>' + jobID + '</td></tr>');
    }
    
    //removes job from queue table
    function removeJobQTable(jobID){
        $("#"+jobID).remove();
    }
    
    //updates fixed partition table using partitions array
    function updateFPartitionTable(){
        $("#tbodyFixed").empty();
        for(let i = 0;i < partitions.length;i++){
            $("#tbodyFixed").append('<tr><td>' + partitions[i].pSize + '</td><td>' + partitions[i].memAddress + '</td><td>' +
                partitions[i].access + '</td><td>' + partitions[i].pStatus + '</td></tr>');
        }
    }

    //updates dynamic partition table using dPartitions array
    function updateDPartitionTable(){
        $("#tbodyDynamic").empty();
        for(let i = 0;i < dPartitions.length;i++){
            if(dPartitions[i].pStatus == "free"){
                $("#tbodyDynamic").append('<tr><td>' + dPartitions[i].memAddress + '</td><td>' + dPartitions[i].pSize + '</td></tr>');
            }

        }
    }

    //updates total fragmentation count
    function updateTotalFrag(){
        $("#totalFrag").html('Total Fragmentation: ' + totalFrag);
    }

    //adds job to remove list and to job array
    function addJob(job){
        $("#removeJobList").append($('<option>').val(job.jobID).text(job.jobID));
        jobs.push(job);
    }

    //adds job to fixed array using user selected allocation scheme
    function addFixedArray(fArr, job, allocationScheme) {
        let maxPartition = 0;
        let maxPos = -1;
        let jobSize = job.jobSize;
        let jobName = job.jobID;
        fArr.forEach(element => {
            if (element.pSize > maxPartition) {
                maxPartition = element.pSize;
                maxPos = fArr.indexOf(element);
            }
        });
        //first fit scheme. traverses array until finds free partition with enough space for job
        if (allocationScheme == "First-Fit") {
            for (let i = 0; i < fArr.length; i++) {
                //if partition satisfies requirements will update partition values
                if (fArr[i].pStatus == "free" && fArr[i].pSize >= jobSize) {
                    fArr[i].job = job;
                    fArr[i].pStatus = 'busy';
                    fArr[i].access = jobName;
                    totalFrag = totalFrag + (fArr[i].pSize - jobSize);
                    addJob(job);
                    return true;
                }
            }//returns false if no partition found
            return false;
            //same as first fit except uses nextFitCursor to keep track of position after job is placed
        } else if (allocationScheme == "Next-Fit") {
            for (let i = 0; i < fArr.length; i++) {
                if (fArr[nextFitCursor].pStatus == "free" && fArr[nextFitCursor].pSize >= jobSize) {
                    fArr[nextFitCursor].access = jobName;
                    fArr[nextFitCursor].pStatus = 'busy';
                    fArr[nextFitCursor].job = job;
                    totalFrag = totalFrag + (fArr[nextFitCursor].pSize - jobSize);
                    nextFitCursor++;
                    nextFitCursor = nextFitCursor % fArr.length;
                    addJob(job);
                    return true;
                }
                nextFitCursor++;
                nextFitCursor = nextFitCursor % fArr.length; //modulus used to loop through partitions
            }
            return false;
            //traverses array keeping track of largest partition with enough space to put job in
        } else if (allocationScheme == 'Worst-Fit') {
            let maxPartition = 0;
            let maxPos = -1;
            fArr.forEach(element => {
                if (element.pStatus == "free" && element.pSize >= jobSize && element.pSize > maxPartition) {
                    maxPartition = element.pSize;
                    maxPos = fArr.indexOf(element);
                }
            });
            if (maxPos != -1) { //valid partition found and will update values
                fArr[maxPos].job = job;
                fArr[maxPos].access = jobName;
                fArr[maxPos].pStatus = 'busy';
                totalFrag = totalFrag + (fArr[maxPos].pSize - jobSize);
                addJob(job);
                return true;
            } else {
                return false
            }
            // best fit traverses partitions to find one of least size and still big enough to store job
        } else if (allocationScheme == 'Best-Fit') {
            let bestPartition = maxPartition;
            let bestPos = -1;
            fArr.forEach(element => {
                if (element.pStatus == "free" && element.pSize >= jobSize && element.pSize <= bestPartition) {
                    bestPartition = element.pSize;
                    bestPos = fArr.indexOf(element);
                }
            });
            if (bestPos != -1) {
                fArr[bestPos].job = job;
                fArr[bestPos].access = jobName;
                fArr[bestPos].pStatus = 'busy';
                totalFrag = totalFrag + (fArr[bestPos].pSize - jobSize);
                addJob(job);
                return true
            } else {
                return false
            }
        }
    }
    
    //same thing as addFixedArray simply uses dPartitions array instead and splices partitions if job size
    //is less than partition size
    function addDynamicArray(dArr, job, allocationScheme){
        let maxPartition = 0;
        let maxPos=-1;
        let jobSize = job.jobSize;
        let jobName = job.jobID;
        dArr.forEach(element=>{
            if(element.pStatus == "free" && element.pSize > maxPartition){
                maxPartition = element.pSize;
                maxPos = dArr.indexOf(element);
            }
        });
        if(jobSize > maxPartition){
            return false;
        }else{
            if(allocationScheme == "First-Fit"){
                for(let i = 0; i < dArr.length; i++){
                    //if partition satisfies requirements will update value of that partition
                    if(dArr[i].pStatus == "free" && dArr[i].pSize >= jobSize ){
                        let freeSize = dArr[i].pSize - jobSize;
                        dArr[i].pSize = jobSize;
                        dArr[i].access = jobName;
                        dArr[i].pStatus = 'busy';
                        dArr[i].job = job;
                        if(freeSize == 0){//if freesize is 0 then no need to divide partition
                            addJob(job);
                            return true;
                        }else{ //makes new partition if there is still space left after job is inserted
                            let entry = new partitionEntry(freeSize,dArr[i].memAddress + jobSize,null,'free');
                            dArr.splice(i+1,0,entry);
                            addJob(job);
                            return true;
                        }
                    }
                }
                return false
            }else if(allocationScheme == "Next-Fit"){
                for (let i = 0; i < dArr.length; i++){
                    if(dArr[nextFitCursor].pStatus == "free" && dArr[nextFitCursor].pSize >= jobSize ){
                        let freeSize = dArr[nextFitCursor].pSize - jobSize;
                        dArr[nextFitCursor].pSize = jobSize;
                        dArr[nextFitCursor].access = jobName;
                        dArr[nextFitCursor].pStatus = 'busy';
                        dArr[nextFitCursor].job = job;
                        if(freeSize == 0){
                            nextFitCursor++;
                            nextFitCursor = nextFitCursor % dArr.length;
                            addJob(job);
                            return true;
                        }else{
                            let entry = new partitionEntry(freeSize,dArr[nextFitCursor].memAddress + jobSize,null,'free');
                            dArr.splice(nextFitCursor+1,0,entry);
                            nextFitCursor++;
                            nextFitCursor = nextFitCursor % dArr.length;
                            addJob(job);
                            return true;
                        }
                    }
                    nextFitCursor++;
                    nextFitCursor = nextFitCursor % dArr.length;
                }
                return false;
            }else if(allocationScheme == "Worst-Fit"){
                let maxPartition = 0;
                let maxPos=-1;
                dArr.forEach(element=>{
                    if(element.pStatus == "free" && element.pSize >= jobSize && element.pSize > maxPartition ){
                        maxPartition = element.pSize;
                        maxPos = dArr.indexOf(element);
                    }
                });
                if(maxPos != -1){
                    let freeSize = dArr[maxPos].pSize - jobSize;
                    dArr[maxPos].pSize = jobSize;
                    dArr[maxPos].access = jobName;
                    dArr[maxPos].pStatus = 'busy';
                    dArr[maxPos].job = job;
                    if(freeSize == 0){
                        addJob(job);
                        return true;
                    }else{
                        let entry = new partitionEntry(freeSize,dArr[maxPos].memAddress + jobSize,null,'free');
                        dArr.splice(maxPos+1,0,entry);
                        addJob(job);
                        return true;
                    }
                }else{
                    return false
                }
            }else if(allocationScheme == "Best-Fit"){
                let bestPartition = maxPartition;
                let bestPos=-1;
                dArr.forEach(element=>{
                    if(element.pStatus == "free" && element.pSize >= jobSize && element.pSize <= bestPartition ){
                        bestPartition = element.pSize;
                        bestPos = dArr.indexOf(element);
                    }
                });
                if(bestPos != -1){
                    let freeSize = dArr[bestPos].pSize - jobSize;
                    dArr[bestPos].pSize = jobSize;
                    dArr[bestPos].access = jobName;
                    dArr[bestPos].pStatus = 'busy';
                    dArr[bestPos].job = job;
                    if(freeSize == 0){
                        addJob(job);
                        return true;
                    }else{
                        let entry = new partitionEntry(freeSize,dArr[bestPos].memAddress + jobSize,null,'free');
                        dArr.splice(bestPos+1,0,entry);
                        addJob(job);
                        return true;
                    }
                }else{
                    return false
                }
            }
        }
    }

    //merges dynamic partitions if possible
    function updateDynamicArray(dArr){
        let updated = false;
        for(let i = 0; i < dArr.length-1; i++){
            //checks if current and next partition are free if so will merge partitions
            if(dArr[i].pStatus == "free" && dArr[i+1].pStatus == "free" ){
                let newSize = dArr[i].pSize + dArr[i+1].pSize;
                dArr[i].pSize = newSize;
                dArr.splice(i+1,1);
                i--;//will decrement i to check same partition index again in case the next partition is also free
                updated = true;
            }
        }
        return updated;
    }

    //checks if there is enough memory available to process job at head of job queue
    function updateJobQueue(){
            let memAvailable = true;
            while(memAvailable){
                //checks if queue is not empty
                if(jobQueue.length != 0){
                    let firstJob = jobQueue[0];
                    if(pType == "Dynamic"){
                        for(let i = 0; i < dPartitions.length; i++) {
                            //if there is a partition that can store job will invoke addDynamicArray() to properly
                            //place the job.Same thing for Fixed will invoke addFixedArray()
                            if(dPartitions[i].pStatus == 'free' && dPartitions[i].pSize >= firstJob.jobSize){
                                addDynamicArray(dPartitions,firstJob,aScheme);
                                removeJobQTable(firstJob.jobID);
                                i = dPartitions.length; //will exit out of for loop every time it first removes job from queue
                                jobQueue.shift();
                                //sends text to snapshot logs of job that arrived
                                let input = "<p> job " +  firstJob.jobID + " arrives</p>"
                                $(input).appendTo($('#snapshotLogs'));
                                memAvailable = !memAvailable; //will flip boolean to check next job in queue
                            }
                        }
                        //flips boolean, if first job is removed from queue will check next job. else will exit function
                        memAvailable = !memAvailable;
                    }else {//pType = fixed
                        for (let i = 0; i < partitions.length; i++) {
                            if (partitions[i].pStatus == 'free' && partitions[i].pSize >= firstJob.jobSize) {
                                addFixedArray(partitions,firstJob,aScheme);
                                removeJobQTable(firstJob.jobID);
                                i = partitions.length;
                                jobQueue.shift();
                                let input = "<p> job " +  firstJob.jobID + " arrives</p>"
                                $(input).appendTo($('#snapshotLogs'));
                                memAvailable = !memAvailable;
                            }
                        }
                        memAvailable = !memAvailable;
                    }
                }else{
                    memAvailable = false;
                }
            }
    }

    //removes job from partition, table, and remove job list
    function removeJob(jobID){
        let jobSize;
        if(pType == "Dynamic"){
            //removes from partition
            for(let i = 0; i < dPartitions.length; i++){
                if(dPartitions[i].job != null){
                    if(dPartitions[i].job.jobID == jobID){
                        jobSize = dPartitions[i].job.jobSize;
                        dPartitions[i].pStatus = 'free';
                        dPartitions[i].job= null;
                        dPartitions[i].access = null;
                        if(!updateDynamicArray(dPartitions)){
                            totalFrag += jobSize;
                        }
                        updateTotalFrag(); //for dynamic fragmentation updates on removes
                        //updateJObQ() also removes from job Q table
                        updateJobQueue();
                    }
                }
            }
        //removes job from remove job list
        $(`#removeJobList option[value=${jobID}]`).remove();
        }if(pType == "Fixed"){
            //removes from partition
            for(let i = 0; i < partitions.length; i++){
                if(partitions[i].job != null){
                    if(partitions[i].job.jobID ==jobID){
                        partitions[i].pStatus = 'free';
                        partitions[i].job= null;
                        partitions[i].access = null;
                        updateJobQueue();
                    }
                }
            }
            //removes from job table
            for(let i = 0; i < jobs.length; i++) {
                if (jobs[i].jobID == jobID) {
                    jobs.splice(i, 1);
                }
            }
            //removes job from remove job list
            $(`#removeJobList option[value=${jobID}]`).remove();
        }
    }

    function createBar(){
        //initialize svg and set attributes
        let svg = d3.select("#snapshot")
            .append("svg")
                .attr("width",400)
                .attr("height", 450)
                .attr("id","bar");
        //append container "g" to svg and shift 20 right and 10 down
        let group = svg.append('g')
                .attr("transform","translate(20,10)");
        //add grey rectangle and label starting address
        group.append('rect')
            .attr('height',400)
            .attr("width",200)
            .attr('fill','grey');
        group.append('text')
            .text(startingAddress)
            .attr("transform",'translate(205,5)');
        //since height is 400px the scale is 400px/memSize will be constant
        const SCALE = 400/memSize;

        if(pType == "Fixed"){
            partitions.forEach(element =>{
                let startY = (element.memAddress - startingAddress) * SCALE;
                let height = element.pSize * SCALE;
                //if partition is free will draw rectangle and append it to the g container
                if(element.pStatus == "free"){
                    group.append('rect')
                        .attr('height',height)
                        .attr("width",200)
                        .attr('fill','green')
                        .attr('y',startY)
                        .attr('stroke','black')
                        .attr('stroke-width','5');
                    //appends job info text to center of rectangle and appends last memory address to right side of graph
                    group.append('text') 
                        .text(element.memAddress + element.pSize)
                        .attr("transform",'translate(205,' +  (startY+height + 5) +')');
                }else{//partition is busy which will make rectangle red inside green rectangle
                    let jobHeight = element.job.jobSize *SCALE;
                    //same green rectangle as above
                    group.append('rect')
                        .attr('height',height)
                        .attr("width",200)
                        .attr('fill','green')
                        .attr('y',startY)
                        .attr('stroke','black')
                        .attr('stroke-width','5');
                    group.append('text')
                        .text(element.memAddress + element.pSize)
                        .attr("transform",'translate(205,' +  (startY+height + 5) +')');
                    //appending red rectangle over green rectangle representing job
                    group.append('rect')
                        .attr('height',jobHeight)
                        .attr("width",196)
                        .attr('fill','red')
                        .attr('y',startY)
                        .attr('stroke','black')
                        .attr('stroke-width','1')
                        .attr("transform","translate(2,1)");
                    group.append('text')
                        .text(element.memAddress + element.job.jobSize)
                        .attr("transform",'translate(205,' +  (startY+jobHeight + 5) +')');
                    group.append('text')
                        .text("Job " + element.job.jobID + ' (' + element.job.jobSize +')')
                        .attr('transform',"translate(70,"  + ((jobHeight/2)+startY+5) +")");
                }
            });
        }else{ //partition is dynamic same notes as drawing for fixed 
            dPartitions.forEach(element =>{
                let startY = (element.memAddress - startingAddress) * SCALE;
                let height = element.pSize * SCALE;
                if(element.pStatus == "free"){
                    group.append('rect')
                        .attr('height',height)
                        .attr("width",200)
                        .attr('fill','green')
                        .attr('y',startY)
                        .attr('stroke','black')
                        .attr('stroke-width','3');
                    group.append('text')
                        .text(element.memAddress + element.pSize)
                        .attr("transform",'translate(205,' +  (startY+height + 5) +')');

                }else{//partition is busy
                    group.append('rect')
                        .attr('height',height)
                        .attr("width",200)
                        .attr('fill','red')
                        .attr('y',startY)
                        .attr('stroke','black')
                        .attr('stroke-width','3');
                    group.append('text')
                        .text(element.memAddress + element.pSize)
                        .attr("transform",'translate(205,' +  (startY+height + 5) +')');
                    group.append('text')
                        .text("Job " + element.job.jobID + ' (' + element.job.jobSize +')')
                        .attr('transform',"translate(70,"  + ((height/2)+startY+5) +")");
                }
            });
        }
    }

    //class to make partition entry objects
    class partitionEntry{
        constructor(pSize, memAddress, access, pStatus, job) {
            this.pSize = Number(pSize);
            this.memAddress = Number(memAddress);
            this.access = access;
            this.pStatus = pStatus;
            this.job = job;
        }
    }

    //class to job objects
    class Job{
        constructor(jobSize,jobID) {
            this.jobSize = jobSize;
            this.jobID = jobID;
        }
    }
});