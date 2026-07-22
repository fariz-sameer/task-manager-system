let currentTask = null;
let editingActivity = null;
let editingRemark = null;
let drawer = null;

function getCsrfToken() {
  return $("input[name=csrfmiddlewaretoken]").first().val();
}

function refreshTaskTable() {
  const query = $("#filterForm").serialize();

  return $.ajax({
    url: "/table/",
    type: "GET",
    data: query,
    cache: false,

    success: function (html) {
      $("#taskTableWrapper").replaceWith(html);

      document
        .querySelectorAll("#taskTableWrapper .status-dropdown")
        .forEach(function (dropdown) {
          paintStatusDropdown(dropdown);
        });
    },

    error: function () {
      alert("Failed to refresh task table.");
    },
  });
}

$(document).on("click", ".drawer-action-header", function () {
  $(this).closest(".drawer-action-card").toggleClass("open");
});

$(function () {
  document.querySelectorAll(".status-dropdown").forEach(function (dropdown) {
    paintStatusDropdown(dropdown);
  });

  $(document).on("submit", "#filterForm", function (e) {
    e.preventDefault();

    refreshTaskTable();
  });

  $(document).on("submit", "#addTaskForm", function (e) {
    e.preventDefault();

    const form = $(this);

    $.ajax({
      url: form.attr("action"),
      type: "POST",
      data: form.serialize(),
      success: function () {
        form[0].reset();
        refreshTaskTable();
      },
      error: function () {
        alert("Failed to create task.");
      },
    });
  });

  drawer = new bootstrap.Offcanvas(document.getElementById("taskDrawer"));

  $(document).on("click", "#resetFilters", function (e) {
    const form = $("#filterForm");

    form[0].reset();

    refreshTaskTable();
  });

  $(document).on("click", ".task-link", function (e) {
    e.preventDefault();

    loadTaskDrawer($(this).data("task"));
  });

  $(document).on("click", ".delete-task", function (e) {
    e.preventDefault();

    if (!confirm("Delete this task?")) {
      return;
    }

    const link = $(this);

    $.post(
      link.attr("href"),
      {
        csrfmiddlewaretoken: getCsrfToken(),
      },
      function () {
        if (currentTask && String(currentTask) === String(link.data("task"))) {
          drawer.hide();
          currentTask = null;
        }

        refreshTaskTable();
      },
    );
  });

  document.querySelectorAll(".auto-expand").forEach(function (textarea) {
    textarea.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });
  });

  $("#filterToggle").click(function () {
    $("#filterPanel").toggleClass("show");
  });
});

let tooltipTimer;


$(document).on(
    "mouseenter",
    ".task-hover",
    function(e){

        let element = $(this);

        tooltipTimer = setTimeout(function(){

            let description =
                element.data("description");


            if(!description){

                description = "No description provided.";

            }


            $("#taskPreviewTooltip")
                .html(`
                    <strong>
                        ${element.text()}
                    </strong>

                    <hr>

                    ${description}
                `)
                .css({

                    top:
                    e.pageY + 20,

                    left:
                    e.pageX + 20

                })
                .fadeIn(200);


        },500); // delay before showing

    }
);


$(document).on(
    "mousemove",
    ".task-hover",
    function(e){

        $("#taskPreviewTooltip")
            .css({

                top:e.pageY + 20,

                left:e.pageX + 20

            });

    }
);


$(document).on(
    "mouseleave",
    ".task-hover",
    function(){

        clearTimeout(tooltipTimer);

        $("#taskPreviewTooltip")
            .fadeOut(150);

    }
);

$("#columnToggleBtn").click(function(){

    $("#columnMenu").toggle();

});


$(document).on(
"change",
"#columnMenu input",
function(){

    let column = $(this).data("column");

    let visible = $(this).is(":checked");


    $(`[data-column="${column}"]`)
        .toggle(visible);

});

$(document).on("click", "#generateDigestBtn", function () {

    const selectedDate = $("#digestDate").val();

    if (!selectedDate) {
        alert("Please select a date.");
        return;
    }

    const button = $(this);

    button.prop("disabled", true);
    button.text("Generating...");

    $("#digestResult").html(`

    <div class="text-center py-5">

        <div class="spinner-border text-primary"></div>

        <h6 class="mt-3">
            Gemini is analysing today's work...
        </h6>

        <small class="text-muted">
            Reviewing activities across all companies
        </small>

    </div>

    `);

    $.ajax({

        url: "/executive-digest/",

        type: "GET",

        data: {
            date: selectedDate
        },

        success: function (response) {

            let summary = response.summary;

            summary = summary
                .replace(
                    "Operational Velocity",
                    '<h4 class="text-success">  Operational Velocity</h4>'
                )
                .replace(
                    "Bottlenecks",
                    '<h4 class="text-danger mt-4"> Bottlenecks</h4>'
                )
                .replace(
                    "Tomorrow\'s Priorities",
                    '<h4 class="text-primary mt-4"> Tomorrow\'s Priorities</h4>'
                );

            $("#digestResult").html(`

            <div class="executive-report">

                <div class="report-top">

                    <small>

                        ${response.generated_at}

                    </small>

                </div>

                <div class="report-body">

                    ${summary}

                </div>

            </div>

            `);
            
            $("#lastDigestTime").text(response.generated_at);
        },

        error: function () {

            $("#digestResult").html(`
                <div class="alert alert-danger">
                    Unable to generate executive digest.
                </div>
            `);

        },

        complete: function () {

            button.prop("disabled", false);
            button.text("Generate Digest");

        }
        
    });

});

const today = new Date().toISOString().split("T")[0];

$("#digestDate").val(today);

