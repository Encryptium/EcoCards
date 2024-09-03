console.log("assignment-editor.js loaded");

document.getElementById('assignment-file').addEventListener('change', function(event) {
    document.getElementById('file-label').textContent = event.target.files[0].name;
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const image = document.getElementById('image-viewer');
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

var mode = "drag";
const editorOptions = document.querySelectorAll("#options div ul li");
const editLog = [];

for (var i = 0; i < editorOptions.length; i++) {
    editorOptions[i].addEventListener("click", function() {
        mode = this.id;
        updateMode();
    });
}

function updateMode(m = undefined) {
    if (m) {
        mode = m;
    }
    document.getElementById(mode).style.backgroundColor = "lightgrey";
    for (var j = 0; j < editorOptions.length; j++) {
        if (editorOptions[j].id != mode) {
            editorOptions[j].style.backgroundColor = "white";
        }
    }

    const elements = document.querySelectorAll('textarea, input.field');
    elements.forEach(element => {
        if (mode === "erase") {
            element.setAttribute('disabled', true);
            element.style.cursor = "pointer"; // Change cursor to pointer to indicate deletable
            element.addEventListener('click', handleEraseClick);
        } else {
            element.removeAttribute('disabled');
            element.style.cursor = ""; // Reset cursor to default
            element.removeEventListener('click', handleEraseClick);
        }
    });
}

function handleEraseClick(event) {
    event.stopPropagation(); // Prevent any other click events from firing
    const elementToErase = event.target;

    // Remove the element from the DOM
    elementToErase.remove();

    // Find and remove the corresponding entry in the editLog
    const index = editLog.findIndex(entry => entry.targetElement === elementToErase);
    if (index !== -1) {
        editLog.splice(index, 1);
    }

    console.log(editLog); // Log the updated editLog to confirm changes
}

document.getElementById('image-viewer').addEventListener('mousedown', function(event) {
    const image = document.getElementById('image-viewer');
    const rect = image.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (mode == "annotation") {
        const annotation = document.createElement("textarea");
        annotation.style.position = "absolute";
        annotation.style.left = x + "px";
        annotation.style.top = y + "px";
        annotation.style.width = "150px";
        annotation.style.height = "50px";
        annotation.style.fontSize = "12px";
        annotation.style.zIndex = 1000;
        image.parentElement.appendChild(annotation);

        const logEntry = {
            type: "annotation",
            x: x,
            y: y,
            content: "",
            targetElement: annotation
        };

        editLog.push(logEntry);

        annotation.addEventListener("blur", function() {
            logEntry.content = annotation.value;
            console.log(editLog);
        });

        annotation.addEventListener("click", function(event) {
            event.stopPropagation(); // Prevent triggering another click event
        });

        updateMode("drag");
    }

    if (mode == "field") {
        const inputField = document.createElement("input");
        inputField.type = "text";
        inputField.className = "field";  // Add the class "field"
        inputField.style.position = "absolute";
        inputField.style.left = x + "px";
        inputField.style.top = y + "px";
        inputField.style.width = "150px";
        inputField.style.fontSize = "12px";
        inputField.style.zIndex = 1000;
        image.parentElement.appendChild(inputField);

        const logEntry = {
            type: "field",
            x: x,
            y: y,
            max_points: 5, // You can set this dynamically if needed
            default_value: "",
            targetElement: inputField
        };

        editLog.push(logEntry);

        inputField.addEventListener("blur", function() {
            logEntry.default_value = inputField.value;
            console.log(editLog);
        });

        inputField.addEventListener("click", function(event) {
            event.stopPropagation(); // Prevent triggering another click event
        });

        updateMode("drag");
    }

    if (mode == "drag") {
        let draggedElement = null;
        let offsetX, offsetY;

        // Expand the detection area by checking if the click is close to an element
        const elements = Array.from(document.querySelectorAll('textarea, input.field'));
        draggedElement = elements.find(el => {
            const rect = el.getBoundingClientRect();
            return (
                event.clientX >= rect.left - 5 &&
                event.clientX <= rect.right + 5 &&
                event.clientY >= rect.top - 5 &&
                event.clientY <= rect.bottom + 5
            );
        });

        if (draggedElement) {
            const rect = draggedElement.getBoundingClientRect();
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function onMouseMove(event) {
            const newX = event.clientX - offsetX;
            const newY = event.clientY - offsetY;
            if (draggedElement) {
                draggedElement.style.left = newX + 'px';
                draggedElement.style.top = newY + 'px';
            }
        }

        function onMouseUp() {
            if (draggedElement) {
                const newRect = draggedElement.getBoundingClientRect();
                const newX = newRect.left - image.getBoundingClientRect().left;
                const newY = newRect.top - image.getBoundingClientRect().top;

                const logEntry = editLog.find(entry => entry.targetElement === draggedElement);
                if (logEntry) {
                    logEntry.x = newX;
                    logEntry.y = newY;
                }

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                draggedElement = null; // Reset the dragged element
                console.log(editLog);
            }
        }
    }

    if (mode == "erase") {
        // The erase functionality is now handled in the updateMode and handleEraseClick functions
    }

    if (mode == "undo") {
        const lastEdit = editLog.pop();
        if (lastEdit && lastEdit.targetElement) {
            lastEdit.targetElement.remove();
        }
        console.log(editLog);

        // Reset the mode to "drag" after undoing an edit
        updateMode("drag");
    }

    console.log(editLog);
});