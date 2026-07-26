function buildDrawerFooter(task) {
  if (task.is_follower) {
    return `

            <div class="drawer-action-card">

                <div class="drawer-action-header">

                    <div>

                        <h6>
                            <i class="bi bi-chat-dots-fill"></i>
                            Discussion
                        </h6>

                        <small>
                            Click to leave a remark
                        </small>

                    </div>

                    <i class="bi bi-chevron-down action-arrow"></i>

                </div>

                <div class="drawer-action-body">

                    <textarea
                        id="remarkMessage"
                        class="form-control"
                        rows="4"
                        placeholder="Write your thoughts..."></textarea>

                    <button
                        class="btn btn-success mt-3"
                        id="postRemark">
                        <i class="bi bi-send-fill"></i>
                        Post Remark
                    </button>

                </div>

            </div>

            `;
  } else {
    return `

            <div class="drawer-action-card">

                <div class="drawer-action-header">

                    <div>

                        <h6>
                            <i class="bi bi-pencil-square"></i>
                            Progress Update
                        </h6>

                        <small>
                            Click to write an update
                        </small>

                    </div>

                    <i class="bi bi-chevron-down action-arrow"></i>

                </div>

                <div class="drawer-action-body">

                    <textarea
                        id="progressMessage"
                        class="form-control"
                        rows="4"
                        placeholder="Write your progress updates..."></textarea>

                    <div class="upload-actions">

                        <button
                            class="btn btn-success"
                            id="postUpdate">
                            <i class="bi bi-send-fill"></i>
                            Post Update
                        </button>

                        <label for="progressFiles" class="custom-upload">

                            <div class="upload-icon">
                                <i class="bi bi-cloud-arrow-up-fill"></i>
                            </div>

                            <div class="upload-text">

                                <h6>
                                    Upload Attachments
                                </h6>

                                <small>
                                    <strong>Maximum 10 MB total</strong>
                                </small>

                            </div>

                        </label>

                        

                    </div>

                    <input
                        type="file"
                        id="progressFiles"
                        multiple
                        hidden>

                    <div
                        id="selectedFiles"
                        class="mt-3">

                    </div>

                </div>

            </div>

            `;
  }
}

function buildActivityHtml(task) {
  if (task.activities.length === 0) {
    return `
      <p class="text-muted">
        No activity yet.
      </p>
    `;
  }

  let html = "";

  task.activities.forEach(function (activity) {
    let attachments = "";

    activity.attachments.forEach(function (file) {
      attachments += `
        <div class="mt-2">
          <a href="${file.url}" target="_blank">
            📎 ${file.name}
          </a>
        </div>
      `;
    });

    let buttons = "";

    if (activity.type === "COMMENT" && activity.owner === task.current_user) {
      buttons += `
        <button
          class="btn btn-sm btn-outline-primary edit-activity"
          data-id="${activity.id}">
          <i class="bi bi-pencil-fill"></i>
          
        </button>
      `;
    }

    if (activity.owner === task.current_user || task.is_owner) {
      buttons += `
        <button
          class="btn btn-sm btn-outline-danger delete-activity"
          data-id="${activity.id}">
          <i class="bi bi-trash-fill"></i>
          
        </button>
      `;
    }

    html += `
      <div class="activity-item">

        <small>${activity.time}</small>

        <br>

        <strong>${activity.user}</strong>

        <p class="activity-message mt-2">
          ${activity.message}
        </p>

        ${attachments}

        <br><br>

        ${buttons}

      </div>
    `;
  });

  return html;
}

function buildRemarkHtml(task) {
  if (task.remarks.length === 0) {
    return `
            <p class="text-muted">
                No remarks yet.
            </p>
        `;
  }

  let html = "";

  task.remarks.forEach(function (remark) {
    let buttons = "";

    if (remark.can_edit) {
      buttons += `
                    <button
                        class="btn btn-sm btn-outline-primary edit-remark"
                        data-id="${remark.id}">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                `;
    }

    if (remark.can_delete) {
      buttons += `
                    <button
                        class="btn btn-sm btn-outline-danger delete-remark"
                        data-id="${remark.id}">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                `;
    }

    html += `

              <div class="activity-item">

                  <small>${remark.time}</small>

                  <br>

                  <strong>${remark.user}</strong>

                  <p class="activity-message mt-2">

                      ${remark.message}

                  </p>

                  ${buttons}

              </div>

          `;
  });

  return html;
}

function renderTaskDrawer(task) {

  loadStatusChart(task.id);

  let users = "";
  task.assignees.forEach(function (name) {
    users += `
          <span class="badge bg-primary me-1">
            ${name}
          </span>
      `;
  });

  let followers = "";
  task.followers.forEach(function (name) {
    followers += `
              <span class="badge bg-secondary me-1">
                  ${name}
              </span>
          `;
  });

  let statusLabel = "";

  if (task.is_assignee && !task.is_owner) {

      statusLabel = "Your Status";

  } else {

      statusLabel = "Overall Task Status";

  }

  $("#drawerTitle").text(task.title);

  $("#drawerContent").html(`
    <div class="drawer-section">
      <h6>Status</h6>
      <small class="text-muted">
        ${task.status_context}
      </small>

      <p class="mt-2">
          ${task.status}
      </p>
    </div>

    <div class="drawer-section">
      <h6>Company</h6>
      <p>${task.company}</p>
    </div>

    <div class="drawer-section">
      <h6>Deadline</h6>
      <p>${task.deadline}</p>
    </div>

    <div class="drawer-section">
      <h6>Owner</h6>
      <span class="badge bg-success me-1"
        <p>${task.owner}</p>
      </span>
    </div>

    <div class="drawer-section">
      <h6>Assigned Users</h6>
      ${users}
    </div>

    <div class="drawer-section">
        <h6>Followers</h6>
        ${followers}
    </div>

    <div class="drawer-section">
      <h6>Description</h6>
      <p>${task.details}</p>
    </div>

    

    <hr class="drawer-hr">

    <div class="status-chart-card">

      <div class="status-chart-header">

          <h6>
              <i class="bi bi-pie-chart-fill"></i>
              Status Distribution
          </h6>

      </div>

      <div class="status-chart-body">

          <div class="chart-wrapper">
              <canvas id="statusChart"></canvas>
          </div>

          <div id="assigneeStatusList" class="assignee-status-list">

          </div>

      </div>

  </div>

    <div class="ai-summary-card">

        <div class="ai-summary-header">
            <div>
                <h5>
                    <i class="bi bi-stars"></i>
                    AI Task Summary
                </h5>
                <small>Generated from task activities</small>
            </div>

            <button
                class="btn btn-success"
                id="generateSummaryBtn">
                <i class="bi bi-magic"></i>
                Generate
            </button>
        </div>

        <div id="aiSummary" class="ai-summary-body">
            <div class="empty-summary">
                <i class="bi bi-robot"></i>
                <p>No summary generated yet.</p>
            </div>
        </div>

    </div>

    <div class="drawer-columns">
      <div class="activity-column">
          <h6>
          <i class="bi bi-clock-history"></i>
          Activity</h6>
          ${buildActivityHtml(task)}
      </div>
      <div class="remarks-column">
          <h6>
          <i class="bi bi-chat-dots"></i>
          Follower Remarks</h6>
          ${buildRemarkHtml(task)}
      </div>
  </div>
  `);
}

function loadTaskDrawer(taskId) {
  currentTask = taskId;

  $("#drawerTitle").text("Loading...");
  $("#drawerContent").html("<p>Loading task...</p>");

  drawer.show();

  $.ajax({
    url: "/task/" + taskId + "/data/",

    type: "GET",

    cache: false,

    success: function (task) {
      $("#drawerFooter").html(buildDrawerFooter(task));
      renderTaskDrawer(task);
    },
  });

  $("#notification-" + taskId)
    .removeClass("bg-danger")
    .addClass("bg-success")
    .text("Seen");
}

function refreshTaskDrawer() {
  if (currentTask) {
    loadTaskDrawer(currentTask);
  }
}

function refreshCurrentTask() {
  refreshTaskTable().done(refreshTaskDrawer);
}

function refreshAfter(successCallback = null) {
  refreshTaskTable().done(function () {
    refreshTaskDrawer();

    if (typeof successCallback === "function") {
      successCallback();
    }
  });
}

let statusChart = null;


function loadStatusChart(taskId){


    $.ajax({

        url:
        "/task/" + taskId + "/status-distribution/",


        type:"GET",


        success:function(data){
            const statusUsers = data.users;


            let ctx =
            document.getElementById(
                "statusChart"
            );


            if(statusChart){

                statusChart.destroy();

            }


            statusChart = new Chart(ctx, {


                type:"doughnut",


                data:{


                    labels:data.labels,


                    datasets:[{

                      data:data.values,

                        borderRadius:3,

                        spacing:2,

                        hoverOffset:18,

                        borderColor:"#fcfafa",

                        borderWidth:1,


                      backgroundColor:data.labels.map(function(status){


                          let colors = {


                              "New":"#c4f9cc",

                              "Urgent":"#ff3b30",

                              "In Progress":"#ffc107",

                              "Pending":"#2196f3",

                              "For Discussion":"#ff9800",

                              "Not Ready":"#e4e4e4",

                              "Finished":"#9c27b0",

                              "Completed":"#28a745",

                              "Closed To Reopen":"#343a40",

                              "Cancelled":"#6c757d"


                          };


                          return colors[status] || "#40916c";


                      })

                  }]

                },


                options:{


                  responsive:true,

                  maintainAspectRatio:false,

                  animation:{
                    animateRotate:true,
                    animateScale:true,
                    duration:1400,
                    easing:"easeOutQuart"
                },

                  cutout:"65%",


                  plugins:{


                      legend:{
                        position:"right",

                        labels:{
                            padding:30,

                            usePointStyle:true,

                            pointStyle:"circle",

                            boxWidth:12,

                            boxHeight:12,

                            font:{
                                size:13,
                                weight:"600"
                            }
                        }
                    },


                      tooltip:{

                            backgroundColor:"#1b4332",

                            titleColor:"#fff",

                            bodyColor:"#fff",

                            padding:14,

                            cornerRadius:14,

                            displayColors:false,

                            titleFont:{
                                size:15,
                                weight:"bold"
                            },

                            bodyFont:{
                                size:13
                            },

                            callbacks:{

                                title:function(context){

                                    const status = context[0].label;
                                    const count = context[0].raw;

                                    return `${status} (${count})`;

                                },

                                label:function(context){

                                    const status = context.label;

                                    const users = statusUsers[status] || [];

                                    if(users.length === 0){

                                        return ["No users"];

                                    }

                                    return users.map(user => "• " + user);

                                }

                            }

                        }


                  }


              }


            });


        }

    });


}

$(document).on("click", "#generateSummaryBtn", function () {

    // Show loading animation immediately
    $("#aiSummary").html(`
        <div class="ai-loading">
            <div class="spinner-border text-success" role="status"></div>
            <p class="mt-3">
                Analyzation in progress...
            </p>
        </div>
    `);

    $("#generateSummaryBtn")
        .prop("disabled", true)
        .html('<i class="bi bi-hourglass-split"></i> Generating...');

    $.get(
        `/task/${currentTask}/ai-summary/`,
        function (data) {

            const bullets = data.summary
                .split("\n")
                .filter(line => line.trim());

            let html = "<ul>";

            bullets.forEach(line => {
                html += `<li>${line.replace(/^[-•]\s*/, "")}</li>`;
            });

            html += "</ul>";

            $("#aiSummary").html(html);
        }
    ).always(function () {

        $("#generateSummaryBtn")
            .prop("disabled", false)
            .html('<i class="bi bi-magic"></i> Generate');

    });

});
