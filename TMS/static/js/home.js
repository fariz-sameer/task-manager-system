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
