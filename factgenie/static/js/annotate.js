const sizes = [50, 50];
const annotator_id = window.annotator_id;
const metadata = window.metadata;

var current_example_idx = 0;
var annotation_set = window.annotation_set;

const total_examples = 5; // custom-factgenie ONELINE 

var examples_cached = {};

// custom-factgenie START
// Annotation categories configuration
const ANNOTATION_CATEGORIES = {
    factual: "Factual Errors",
    cultural: "Cultural Inaccuracies", 
    caricature: "Cliche elements",
    linguistic: "Language error",
    logical: "Logical Errors",
    oversimplification: "Oversimplification",
    unrelatable: "Unlikely or Improbable scenarios",
    comments: "Others"
};

/**
 * Get category options as HTML string for dropdown
 * @param {string} selectedCategory - Currently selected category
 * @returns {string} HTML string for select options
 */
function getCategoryOptionsHTML(selectedCategory = '') {
    return Object.entries(ANNOTATION_CATEGORIES)
        .map(([value, label]) => 
            `<option value="${value}" ${selectedCategory === value ? 'selected' : ''}>${label}</option>`
        )
        .join('');
}
// custom-factgenie END

var splitInstance = Split(['#centerpanel', '#rightpanel'], {
    sizes: sizes,
    gutterSize: 1,
});

function clearExampleLevelFields() {
    // custom-factgenie START
    // Reset dropdowns to default
    $(".crowdsourcing-option select").each(function() {
        $(this).val($(this).find("option:first").val());
    });

    // Reset sliders
    $(".crowdsourcing-slider input[type='range']").each(function() {
        $(this).val($(this).attr('min') || 1);
        const valueDisplay = $(`#${$(this).attr('id')}-value`);
        if (valueDisplay.length) {
            valueDisplay.text(valueDisplay.attr('data-default-value'));
        }
    });
    // custom-factgenie END
    // clear the values in text inputs
    $(".crowdsourcing-text input[type='text']").val("");
}


function collectFlags() {
    const flags = [];
    $(".crowdsourcing-flag").each(function () {
        const label = $(this).find("label").text().trim();
        const value = $(this).find("input[type='checkbox']").prop("checked");
        flags.push({
            label: label,
            value: value
        });
    });
    return flags;
}

function collectOptions() {
    const options = [];

    $(".crowdsourcing-option").each(function (x) {
        // backwards compatibility with old sliders
        if ($(this).hasClass("option-slider")) {
            const type = "slider";
            const label = $(this).find("label").text();
            const index = $(this).find("input[type='range']").val();
            const value = $(this).find("datalist option")[index].value;
            const optionList = $(this).find("datalist option").map(function () {
                return $(this).val();
            }).get();
            options.push({ type: type, label: label, index: index, value: value, optionList: optionList });
        } else {
            const label = $(this).find("label").text().trim();
            const index = $(this).find("select").val();
            const value = $(this).find("select option:selected").text();

            const optionList = $(this).find("select option").map(function () {
                return $(this).text();
            }).get();
            options.push({ label: label, index: index, value: value, optionList: optionList });
        }
    });
    return options;
}

function collectSliders() {
    const sliders = [];

    $(".crowdsourcing-slider").each(function (x) {
        const myId = $(this).find("input[type='range']").attr('id');
        const sliderValueId = `${myId}-value`;

        if ($(`#${sliderValueId}`).text() == $(`#${sliderValueId}`).attr('data-default-value')) {
            return;
        }

        const label = $(this).find("label").text();
        const value = $(this).find("input[type='range']").val();
        const min = $(this).find("input[type='range']").attr('min');
        const max = $(this).find("input[type='range']").attr('max');
        const step = $(this).find("input[type='range']").attr('step');

        sliders.push({ label: label, value: value, min: min, max: max, step: step });
    });
    return sliders;
}

function collectTextFields() {
    const textFields = [];

    $(".crowdsourcing-text").each(function (x) {
        const label = $(this).find("label").text().trim();
        const value = $(this).find("input[type='text']").val();
        textFields.push({ label: label, value: value });
    });
    return textFields;
}

// custom-factgenie START
function fetchAnnotation(dataset, split, setup_id, example_idx, annotation_idx) {
    return new Promise((resolve, reject) => {
        $.get(`${url_prefix}/example`, {
            "dataset": dataset,
            "example_idx": example_idx,
            "split": split,
            "setup_id": setup_id
        }, function (data) {
            const container = $('<div>', {
                id: `out-text-${annotation_idx}`,
                class: 'annotate-box',
                style: 'display: none;'
            });

            // Create comments container if it doesn't exist
            if (!$('#comments-container').length) {
                $('<div>', {
                    id: 'comments-container',
                    html: '<h4>Comments</h4>'
                }).appendTo('#rightpanel');
            }

            $('#outputarea').append(container);

            if (data.html === null || true) {
                $("#centerpanel").hide();
                splitInstance.setSizes([0, 100]);
            }

            data.generated_outputs = data.generated_outputs[0];
            examples_cached[annotation_idx] = data;
            resolve();
        }).fail(reject);
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


function goToAnnotation(example_idx) {
    $(".page-link").removeClass("bg-active");
    $(`#page-link-${example_idx}`).addClass("bg-active");

    $(".annotate-box").hide();
    $(`#out-text-${example_idx}`).show();

    // Scroll to top when navigating to a new example
    scrollToTop();

    // Clear and update form for the new example
    clearExampleLevelFields();

    // Restore saved form data if it exists
    if (annotation_set[example_idx]) {
        const flags = annotation_set[example_idx].flags;
        const options = annotation_set[example_idx].options;
        const sliders = annotation_set[example_idx].sliders;
        const textFields = annotation_set[example_idx].textFields;

        if (flags !== undefined) {
            $(".crowdsourcing-flag").each(function (i) {
                $(this).find("input[type='checkbox']").prop("checked", flags[i]["value"]);
            });
        }

        if (options !== undefined) {
            for (const [i, option] of Object.entries(options)) {
                const div = $(`.crowdsourcing-option:eq(${i})`);
                // we can have either a select or a slider (we can tell by `type`)
                // we need to set the option defined by `index`
                div.find("select").val(option.index);

                // backwards compatibility with old sliders
                if (option.type == "slider") {
                    div.find("input[type='range']").val(option.index);
                }
            }
        }

        if (sliders !== undefined) {
            for (const [i, slider] of Object.entries(sliders)) {
                $(`.crowdsourcing-slider input:eq(${i})`).val(slider.value);
                $(`.slider-crowdsourcing-value:eq(${i})`).text(slider.value);
            }
        }

        if (textFields !== undefined) {
            for (const [i, textField] of Object.entries(textFields)) {
                $(`.crowdsourcing-text input:eq(${i})`).val(textField.value);
            }
        }
    }

    // Clear comments section
    $('#comments-section').empty();
    $('#comments-section').append('<div class="comments-placeholder">Comments will appear here when you highlight text</div>');

    // Restore saved annotations for this page
    const annotations = (annotation_set[example_idx] && annotation_set[example_idx].annotations) || [];
    const docId = `p${example_idx}`;

    if (annotations.length > 0) {
        // First, restore the visual annotations (underlined text)
        spanAnnotator.addAnnotations(docId, annotations);
        
        // Then create comment boxes for each annotation
        annotations.forEach((annotation) => {
            const commentId = `comment-${annotation.id}`;
            const commentBoxId = `comment-box-${annotation.id}`;
            
            // Check if comment box already exists
            if (!$(`#${commentBoxId}`).length) {
                const $commentBox = $('<div>', {
                    id: commentBoxId,
                    class: 'annotation-comment-box'
                }).html(`
                    <div class="comment-box-header">
                        <button class="delete-comment-btn" title="Delete annotation">×</button>
                    </div>
                    <div class="annotation-text">"${annotation.text}"</div>
                    <select class="category-dropdown form-select mb-2" id="category-${annotation.id}" required>
                        <option value="">Select category...</option>
                        ${getCategoryOptionsHTML(annotation.category)}
                    </select>
                    <textarea 
                        id="${commentId}" 
                        class="annotation-comment-input" 
                        placeholder="Comment is required *"
                        required
                    >${annotation.comment || ''}</textarea>
                    <div class="comment-error" style="display: none; color: red; font-size: 12px; margin-top: 4px;">
                        Please add a comment before continuing
                    </div>
                `);

                // Add delete button handler
                $commentBox.find('.delete-comment-btn').on('click', () => {
                    const doc = spanAnnotator.documents.get(docId);
                    const annotationToRemove = doc.annotations.find(a => a.id === annotation.id);
                    if (annotationToRemove) {
                        const $span = $('.annotatable', doc.element).filter((_, span) => {
                            const idx = parseInt($(span).data('index'));
                            return idx >= annotationToRemove.start && idx < annotationToRemove.start + annotationToRemove.text.length;
                        }).first();
                        

                        if ($span.length) {
                            spanAnnotator._removeAnnotation(docId, $span, annotation.id);
                        }
                    }
                });

                // Add category dropdown handler
                $commentBox.find('.category-dropdown').on('change', function() {
                    const selectedCategory = $(this).val();
                    if (selectedCategory) {
                        annotation.category = selectedCategory;
                    }
                    saveCurrentAnnotations(example_idx);
                });

                // Add textarea handler
                $commentBox.find('textarea').on('input', function() {
                    const commentText = $(this).val().trim();
                    annotation.comment = commentText;
                    
                    if (commentText) {
                        $(this).removeClass('is-invalid');
                        $(this).next('.comment-error').hide();
                    } else {
                        $(this).addClass('is-invalid');
                        $(this).next('.comment-error').show();
                    }
                    
                    saveCurrentAnnotations(example_idx);
                });

                // Add comment box to comments section
                $('#comments-section').append($commentBox);
                
                // Remove placeholder if we have comments
                $('.comments-placeholder').remove();
            }
        });
    }

    // Update current example index
    current_example_idx = example_idx;
    annotation_set[example_idx]["timeLastAccessed"] = Math.floor(Date.now() / 1000);

    $("#dataset-spinner").hide();
}

function goToPage(page) {
    // Save form data for the example we are navigating away from.
    saveCurrentAnnotations(current_example_idx);

    // Clamp the page index to valid range
    if (page < 0) page = 0;
    if (page >= total_examples) page = total_examples - 1;
    current_example_idx = page;
    goToAnnotation(current_example_idx);
}

function addPageLink(annotation_idx) {
    const li = $('<li>', { class: "page-item" });
    const a = $('<a>', { class: "page-link bg-incomplete", style: "min-height: 28px;", id: `page-link-${annotation_idx}` }).text(parseInt(annotation_idx) + 1);
    li.append(a);
    $("#nav-example-cnt").append(li);

    // switch to the corresponding example when clicking on the page number
    $(`#page-link-${annotation_idx}`).click(function () {
        goToPage(Number(annotation_idx));
    });
}

function loadAnnotations(campaign) {

    const annotation_span_categories = metadata.config.annotation_span_categories;

    // Clear old page links to avoid duplicates
    $("#nav-example-cnt").empty();

    // 1. Create all containers and addPageLink for each
    const keys = Object.keys(examples_cached);
    keys.forEach((annotation_idx) => {
        // Create the main container if it doesn't exist
        let $container = $(`#out-text-${annotation_idx}`);
        if ($container.length === 0) {
            $container = $('<div>', {
                id: `out-text-${annotation_idx}`,
                class: 'annotate-box',
                style: 'display: none;'
            });
            $('#outputarea').append($container);
        }
        $container.empty(); // Clear any previous content

        // Format the story
        const raw = examples_cached[annotation_idx].generated_outputs.output;
        // Use marked.js to render Markdown to HTML
        const htmlFormatted = marked.parse(raw);

        // Add the story to the container
        const p = $('<div>', { id: `out-text-${annotation_idx}-par`, class: 'annotatable-paragraph' }).html(htmlFormatted);
        $container.append(p);
 
        // Add navigation link
        addPageLink(annotation_idx);
    });

    // 2. Initialize spanAnnotator ONCE
    const annotationOverlapAllowed = metadata.config.annotation_overlap_allowed || false;
    spanAnnotator.init(metadata.config.annotation_granularity, annotationOverlapAllowed, annotation_span_categories);

    // 3. Add all documents to spanAnnotator
    Object.entries(examples_cached).forEach(([annotation_idx, data]) => {
        const $p = $(`#out-text-${annotation_idx}-par`);
        spanAnnotator.addDocument(`p${annotation_idx}`, $p, true);
    });

    // 3b. Render previous annotations if present
    Object.entries(annotation_set).forEach(([annotation_idx, example]) => {
        if (example.annotations && example.annotations.length > 0) {
            spanAnnotator.addAnnotations(`p${annotation_idx}`, example.annotations);
        }
    });

    // 4. Set annotation type ONCE
    spanAnnotator.setCurrentAnnotationType(-2);

    // 5. Show the first example
    goToAnnotation(0);

    // Enable the button and update text
    const button = $("#hideOverlayBtn");
    button
        .prop("disabled", false)
        .html("View the annotation page")
        .addClass("enabled")
        .css({
            'cursor': 'pointer',
            'opacity': '1',
            'pointer-events': 'auto'
        });


    $("#dataset-spinner").hide();
}

function markAnnotationAsComplete() {
    // Save current form state first
    saveCurrentAnnotations(current_example_idx);

    // Check for empty comments
    const currentAnnotations = annotation_set[current_example_idx].annotations || [];
    let hasEmptyFields = false;
    let errorMessages = [];
    
    // Only validate annotations if they exist
    if (currentAnnotations.length > 0) {
    currentAnnotations.forEach(annotation => {
            const $commentBox = $(`#comment-box-${annotation.id}`);
            const $categoryDropdown = $commentBox.find('.category-dropdown');
            const $textarea = $commentBox.find('textarea');
            
            // Reset previous error states
            $categoryDropdown.removeClass('is-invalid');
            $textarea.removeClass('is-invalid');
            $commentBox.find('.invalid-feedback').remove();
            
            // Check category
            if (!$categoryDropdown.val()) {
                hasEmptyFields = true;
                $categoryDropdown.addClass('is-invalid');
                $categoryDropdown.after('<div class="invalid-feedback">Please select a category</div>');
                errorMessages.push(`Category is required for all annotations.`);
            }
            
            // Check comment
            if (!$textarea.val().trim()) {
                hasEmptyFields = true;
                $textarea.addClass('is-invalid');
                $textarea.after('<div class="invalid-feedback">Please add a comment</div>');
                errorMessages.push(`Comments are required for all annotations"`);
            }
        });

        if (hasEmptyFields) {
            alert("Please complete all required fields:\n\n" + errorMessages.join("\n"));
        return;
        }
    }

    // Validate form fields for current example
    let formValid = true;
    let formErrors = [];
    
    // Check required dropdowns
    $(".crowdsourcing-option select").each(function() {
        if (!$(this).val()) {
            formValid = false;
            $(this).addClass('is-invalid');
            formErrors.push("Please answer all questions before marking as complete.");
        } else {
            $(this).removeClass('is-invalid');
        }
    });

    // Check required sliders
    $(".slider-crowdsourcing-value").each(function() {
        if ($(this).text() === $(this).attr('data-default-value')) {
            formValid = false;
            $(this).closest('.crowdsourcing-slider').addClass('is-invalid');
            formErrors.push("Please complete all rating questions before marking as complete.");
        } else {
            $(this).closest('.crowdsourcing-slider').removeClass('is-invalid');
        }
    });

    if (!formValid) {
        alert(formErrors.join("\n"));
        return;
    }

    // Save one final time before proceeding
    saveCurrentAnnotations(current_example_idx);

    // Update UI to show completion
    $('#page-link-' + current_example_idx).removeClass("bg-incomplete");
    $('#page-link-' + current_example_idx).addClass("bg-complete");

    // Check if all examples are complete
    const incompleteExamples = $(".bg-incomplete").length;
    if (incompleteExamples === 0) {
        $("#submit-annotations-btn")
            .show()
            .prop('disabled', false)
            .attr('title', 'Submit all annotations');
    }
    // Move to next example if available and scroll to top
    if (current_example_idx < total_examples - 1) {
        nextBtn();
    }
    
    // Scroll to top even if staying on the same example
    scrollToTop();
}

$("<style>")
    .prop("type", "text/css")
    .html(`
        /* Main layout */
        #rightpanel {
            display: flex !important;
            width: 100% !important;
        }

        #examplearea {
            flex: 0 0 70%;
            padding: 10px;
            overflow-y: auto;
        }

        #outputarea {
            width: 80%;
        }

        .annotatable-paragraph {
            margin-right: 4%;  /* Make space for comments */
        }

        .comment-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
        }

        .comment-input {
            width: 100%;
            min-height: 60px;
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            resize: vertical;
        }

        /* Fix the main layout */
        .large-container {
            margin-right: 25%;
        }

        /* Ensure annotation buttons are visible */
        .mt-3.mb-4.d-flex {
            background: white;
            padding: 10px 0;
            position: sticky;
            top: 0;
            z-index: 200;
        }

        /* Adjust the output area */
        #outputarea {
            width: 100%;
            position: relative;
        }

        /* Container adjustments */
        .container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        /* Ensure navbar doesn't affect layout */
        .navbar {
            margin-bottom: 0;
        }

        /* Main content area */
        #rightpanel {
            background: white;
        }

        /* Ensure annotation tools stay within bounds */
        #output-content {
            overflow: visible;
        }

        .annotation-comment-input {
            border: 1px solid #ccc;
            transition: border-color 0.3s ease;
        }

        .annotation-comment-input.error {
            border-color: #dc3545;
            background-color: #fff8f8;
        }

        .annotation-comment-input:focus {
            outline: none;
            border-color: #80bdff;
            box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
        }

        .annotation-comment-input.error:focus {
            border-color: #dc3545;
            box-shadow: 0 0 0 0.2rem rgba(220,53,69,.25);
        }

        .comment-error {
            color: #dc3545;
            font-size: 12px;
            margin-top: 4px;
        }

        /* Add space below the text type info */
        #text-type-info {
            margin-bottom: 20px; /* Adjust this value for more or less space */
        }

        .comment-dropdown {
            width: 100%;
            margin-bottom: 10px;
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
        }
        
        .annotation-comment-input {
            width: 100%;
            min-height: 60px;
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            margin-top: 5px;
        }

        /* Submit button container adjustments */
        #submit-annotations-btn {
            position: relative !important;
            left: 20px !important;
            // top: 80px !important;  /* Below the navbar */
            z-index: 1000 !important;
            margin-left: 0 !important;
        }

        /* Style for disabled state */
        #submit-annotations-btn:disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }

        /* Ensure the button is visible */
        .btn-success#submit-annotations-btn {
            display: block !important;
            width: auto !important;
            max-width: calc(70% - 40px) !important;
            margin: 0 auto !important;  /* Added to center the button */
        }

        /* Add some space at the bottom of the content area */
        #outputarea {
            margin-bottom: 80px;  /* Space for the submit button */
        }

        /* Ensure the comments section doesn't overlap */
        #comments-section {
            width: 30%;
            right: 0;
            padding-bottom: 100px;  /* Space at the bottom */
        }
    `)
    .appendTo("head");

function positionCommentBox(span, commentBox) {
    const spanRect = span[0].getBoundingClientRect();
    const parentRect = $('#examplearea')[0].getBoundingClientRect();
    
    // Calculate position relative to the viewport
    const top = spanRect.top - parentRect.top;
    
    // Position the comment box
    commentBox.css({
        position: 'relative',
        top: '0',
        marginTop: '10px',
        marginBottom: '20px'
    });
}

function saveCurrentAnnotations(example_idx) {
    if (example_idx < 0) return;

    const annotations = spanAnnotator.getAnnotations(`p${example_idx}`);

    // Initialize annotation_set[example_idx] if it doesn't exist
    if (!annotation_set[example_idx]) {
        annotation_set[example_idx] = {};
    }

    // Save to annotation_set with all form data
    annotation_set[example_idx]["annotations"] = annotations;
    annotation_set[example_idx]["flags"] = collectFlags();
    annotation_set[example_idx]["options"] = collectOptions();
    annotation_set[example_idx]["sliders"] = collectSliders();
    annotation_set[example_idx]["textFields"] = collectTextFields();
    annotation_set[example_idx]["timeLastSaved"] = Math.floor(Date.now() / 1000);
}

// Update the CSS for the end overlay with more specific positioning
$("<style>")
    .prop("type", "text/css")
    .html(`
        /* Thank you overlay */
        #overlay-end {
            display: none;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 70% !important;
            height: 100vh !important;
            background: rgba(255, 255, 255, 0.98) !important;
            z-index: 10000 !important; /* Increased z-index */
            justify-content: center !important;
            align-items: center !important;
        }

        /* Content box */
        #overlay-end-content {
            position: relative !important;
            background: white !important;
            padding: 40px !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
            max-width: 500px !important;
            width: 80% !important;
            text-align: center !important;
            margin: auto !important;
        }

        /* Message styling */
        #final-message {
            font-size: 18px !important;
            line-height: 1.5 !important;
            margin: 20px 0 !important;
            color: #333 !important;
        }

        /* Button styling */
        #overlay-end .btn {
            display: inline-block !important;
            margin-top: 20px !important;
            padding: 10px 30px !important;
            font-size: 16px !important;
            background-color: #007bff !important;
            color: white !important;
            border-radius: 4px !important;
            border: none !important;
            cursor: pointer !important;
        }
    `)
    .appendTo("head");

// Update the submitAnnotations function
function submitAnnotations() {
    
    // Save current annotations before submitting
    saveCurrentAnnotations(current_example_idx);
    let user_ID = sessionStorage.getItem("UserID");

    // Verify all examples are complete
    const incompleteExamples = $(".bg-incomplete").length;
    if (incompleteExamples > 0) {
        alert(`Please complete all examples before submitting (${incompleteExamples} remaining)`);
        return;
    }

    // Ensure each example in annotation_set has required properties
    annotation_set = annotation_set.map(example => {
        return {
            ...example,
            annotations: example.annotations || [],
            flags: example.flags || [],
            options: example.options || [],
            sliders: example.sliders || [],
            textFields: example.textFields || [],
            timeLastSaved: example.timeLastSaved || Math.floor(Date.now() / 1000)
        };
    });


    // Disable button while submitting
    $("#submit-annotations-btn")
        .prop('disabled', true)
        .html('Submitting...');

    $.post({
        url: `${url_prefix}/submit_annotations`,
        contentType: 'application/json',
        data: JSON.stringify({
            campaign_id: metadata.id,
            annotator_id: annotator_id,
            annotation_set: annotation_set,
            user_id: user_ID
        }),
        success: function(response) {
            window.onbeforeunload = null;

            // First hide ALL content
            $(".large-container").hide();
            $("#rightpanel").hide();
            $(".navbar").hide();
            $("#comments-section").remove(); // Remove instead of hide

            if (response.success !== true) {
                $("#error-message").html(response.error);
                $("#overlay-fail").show();
            } else {
                // Show thank you message with clean styling
                $("#final-message").html(response.message || "Thank you for completing the annotations!");
                
                // Update overlay styling
                $("#overlay-end")
                    .css({
                        'display': 'flex',
                        'position': 'fixed',
                        'top': '0',
                        'left': '0',
                        'width': '100%', // Full width
                        'height': '100%',
                        'z-index': '10000',
                        'background': '#fff', // Solid white background
                        'justify-content': 'center',
                        'align-items': 'center'
                    })
                    .show();

                $("#overlay-end-content").css({
                    'display': 'block',
                    'position': 'relative',
                    'z-index': '10001',
                    'text-align': 'center',
                    'padding': '40px',
                    'max-width': '600px',
                    'width': '90%',
                    'background': '#fff',
                    'border-radius': '8px',
                    'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)'
                });
            }
        },
        error: function(xhr, status, error) {
            console.error("Submission error:", error);
            $("#error-message").html(error || "An error occurred during submission");
            $("#overlay-fail").show();
            // Re-enable button on error
            $("#submit-annotations-btn")
                .prop('disabled', false);
        }
    });
}

// Modify form submission
document.getElementById("userForm").addEventListener("submit", function(event) {
    event.preventDefault();
    if (!this.checkValidity()) {
        event.preventDefault();
        alert("Please fill in all required fields.");
        return;
    }
    
    // Hide any previous error
    $("#userFormError").hide().text("");
    
    $("#dataset-spinner").show();
    
    const date = Date.now();
    const userID = document.getElementById("userId").value;
    const campaign =  userID;
    const formData = {
        timestamp: date,
        name: document.getElementById("userName").value,
        userID: document.getElementById("userId").value,
        setup_id: campaign+"gpt-4o",
        campaignId: campaign
    };

    // Save form data to file
    $.post({
        url: `${url_prefix}/save_user_data`,
        contentType: 'application/json',
        data: JSON.stringify({
            campaign_id: campaign,
            user_data: formData
        }),
        success: function(response) {
            // Only proceed if success
            $("#overlay-questions").hide();
            $("#overlay-instructions").show();
            sessionStorage.setItem("UserID", userID);
            
            $.post({
                url: `${url_prefix}/fetch_user_data`,
                contentType: 'application/json',
                data: JSON.stringify({
                    campaign_id: campaign,
                    user_data: formData
                }),
                success: function(response) {
                    // response.data is the array of examples
                    annotation_set = response.data; // array
                    examples_cached = {};

                    annotation_set.forEach((example, idx) => {
                        // Handle cases where output may be in different structures
                        const output_text = example.output || (example.generated_outputs ? example.generated_outputs.output : '');
                        
                        examples_cached[idx] = {
                            ...example,
                            generated_outputs: { output: output_text }
                        };
                    });

                    loadAnnotations(userID); // or whatever campaign/setup_id is needed
                },
                error: function(xhr, status, error) {
                    // Show error and do not proceed
                    $("#userFormError").text("Error fetch User data").show();
                    $("#dataset-spinner").hide();
                }
            });

        },
        error: function(xhr, status, error) {
            // Show error and do not proceed
            $("#userFormError").text("Invalid User ID").show();
            $("#dataset-spinner").hide();
        }
    });
});


// Helper function to create new campaign
function createNewCampaign(data, campaign) {
    $("#dataset-spinner").show();
    $.post({
        url: `${url_prefix}/llm_gen/create`,
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.success !== true) {
                alert("Error creating annotation  campaign. Please reach out to developer. Error" + response.error);
                // $("#hideOverlayBtn").prop("disabled", false);
                return;
            }
            
            // Run campaign after creation
            setTimeout(function() {
                $.post({
                    url: `${url_prefix}/llm_gen/run`,
                    contentType: 'application/json',
                    data: JSON.stringify({
                        campaignId: campaign,
                        setup_id: campaign+data.config.modelName
                    }),
                    success: function(runResponse) {
                        if (runResponse.success !== true) {
                            // $("#hideOverlayBtn").prop("disabled", false);

                            alert("Error running annotation campaign. Please reach out to developer. Error" + runResponse.error);
                            deleteCampaign(campaign);
                            // alert("Error running campaign: " + runResponse.error);
                            return;
                        }

                        // Save generated outputs after successful generation
                        $.post({
                            url: `${url_prefix}/save_generation_outputs`,
                            contentType: 'application/json',
                            data: JSON.stringify({
                                campaignId: campaign,
                                modelName: campaign+data.config.modelName,
                                setup_id: campaign+data.config.modelName
                            }),
                            success: function(saveResponse) {
                                
                                // First delay to ensure file is saved
                                setTimeout(function() {
                                    
                                    // Second delay before attempting to load annotations
                                    setTimeout(function() {
                                        try {
                                            
                                            loadAnnotations(campaign+data.config.modelName);
                                        } catch (error) {
                                            deleteCampaign(campaign);
                                            console.error("Error loading annotations:", error);
                                            alert("Error loading annotation campaign. Please reach out to developer");
                                        }
                                    }, 1000); // 1 second delay before loading annotations
                                    
                                }, 5000); // 5 second delay for file saving
                            },
                            error: function(xhr, status, error) {
                                alert("Error saving annotation campaign. Please reach out to developer. Error" + error);
                                deleteCampaign(campaign);
                            }
                        });
                    },
                    error: function(xhr, status, error) {
                        alert("Error running annotation campaign. Please reach out to developer. Error: " + error);
                        deleteCampaign(campaign);
                    }
                });
            }, 3000);
        },
        error: function(xhr, status, error) {
            alert("Error creating annotation campaign. Please reach out to developer. Error" + error);
            deleteCampaign(campaign);
        }
    });
}

function deleteCampaign(campaign) {

    $.post({
        url: `${url_prefix}/delete_campaign`,
        contentType: 'application/json',
        data: JSON.stringify({
            campaignId: campaign.slice(0,-6)
        }),
        success: function(response) {
        },
        error: function(xhr, status, error) {
        }
    });
}


$("#undo-button").click(function () {
    // Get current document ID based on current example index
    const currentDocId = `p${current_example_idx}`;
    spanAnnotator.undo(currentDocId);
});

$(".btn-err-cat").change(function () {
        const cat_idx = $(this).attr("data-cat-idx");
    if (this.checked) {
        spanAnnotator.setCurrentAnnotationType(cat_idx);
        $(`label[for=${this.id}]`).addClass('active');
    } else {
        spanAnnotator.setCurrentAnnotationType(-2); // Switch to select mode when unchecked
        $(`label[for=${this.id}]`).removeClass('active');
    }
});

$(".btn-eraser").change(function () {
    if (this.checked) {
        spanAnnotator.setCurrentAnnotationType(-1);
    }
});

$(".btn-select").change(function () {
    if (this.checked) {
        spanAnnotator.setCurrentAnnotationType(-2);
    }
});

$('.btn-check').on('change', function () {
    if ($(this).hasClass('btn-err-cat')) {
        // For annotation button, only handle its own state
        const label = $(`label[for=${this.id}]`);
        if (this.checked) {
            label.addClass('active');
        } else {
            label.removeClass('active');
        }
    } else {
        // For other buttons, handle all radio buttons
    $('.btn-check').each(function () {
        const label = $(`label[for=${this.id}]`);
        if (this.checked) {
            label.addClass('active');
        } else {
            label.removeClass('active');
        }
    });
    }
});

$(document).ready(function () {
    $("#total-examples").html(total_examples - 1);
    enableTooltips();

    // Remove ALL existing click handlers
    $("#hideOverlayBtn").off();
    
    // Add a single, simple click handler
    $("#hideOverlayBtn").on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Force remove all overlays
        $("#overlay-instructions").remove();
        $("#overlay-start").remove();
        $("#overlay-questions").hide();
        
        // Show the main interface elements
        $(".large-container").show();
        $("#rightpanel").show();
        $("#outputarea").show();
        $("#checkbox-annotation-box").show();
        $(".navbar").show();
        $("#actions-area").show();
        
        // Ensure proper layout
        if (splitInstance) {
            splitInstance.setSizes([30, 70]);
        }
        
        // Force refresh the current annotation
        setTimeout(() => {
            goToAnnotation(current_example_idx);
        }, 100);
    });

    // Initially disable the submit button
    $("#submit-annotations-btn")
        .show()
        .prop('disabled', true)
        .attr('title', 'Complete all examples before submitting');

    // Ensure we start at the top of the page
    scrollToTop();

    // Add Save Progress and Logout button handler
    $('#save-progress-logout-btn').on('click', function() {
        // Disable button while saving
        $(this).prop('disabled', true).text('Saving...');
        
        // Save the current example's answers before sending all data to the server.
        saveCurrentAnnotations(current_example_idx);

        let user_ID = sessionStorage.getItem("UserID");
        // Save annotation_set to backend via /save_progress
        $.post({
            url: `${url_prefix}/save_progress`,
            contentType: 'application/json',
            data: JSON.stringify({
                campaign_id: metadata.id,
                annotator_id: annotator_id,
                annotation_set: annotation_set,
                user_id: user_ID
            }),
            success: function(response) {
                // Show progress saved overlay and hide main UI
                $(".large-container").hide();
                $("#rightpanel").hide();
                $(".navbar").hide();
                $("#comments-section").remove();
                $("#overlay-progress-saved").show();
                $("#save-progress-logout-btn").prop('disabled', false).text('Save Progress and Logout');
                sessionStorage.removeItem("UserID");
            },
            error: function(xhr, status, error) {
                alert("Error saving progress. Please try again.");
                $("#save-progress-logout-btn").prop('disabled', false).text('Save Progress and Logout');
            }
        });
    });
});

window.onbeforeunload = function () {
    return "Are you sure you want to reload the page? Your work will be lost.";
}

// Add scroll handler to reposition comment boxes
$(window).on('scroll resize', function() {
    const activeSpan = $('.annotated-span.active');
    if (activeSpan.length) {
        const commentId = activeSpan.data('comment-id');
        const commentBox = $(`#${commentId}`);
        positionCommentBox(activeSpan, commentBox);
    }
});
// custom-factgenie END