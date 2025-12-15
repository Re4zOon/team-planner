// Data storage
let teamMembers = [];
let projects = [];
let assignments = {}; // key: "memberId-weekKey-dayIndex", value: [{projectId, hours}, ...]
let currentWeekStart = new Date();

// Initialize to Monday of current week
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
currentWeekStart.setHours(0, 0, 0, 0);

// Load data from localStorage
function loadData() {
    const savedMembers = localStorage.getItem('teamMembers');
    const savedProjects = localStorage.getItem('projects');
    const savedAssignments = localStorage.getItem('assignments');
    
    if (savedMembers) teamMembers = JSON.parse(savedMembers);
    if (savedProjects) projects = JSON.parse(savedProjects);
    if (savedAssignments) {
        assignments = JSON.parse(savedAssignments);
        
        // Migrate old format to new format (backward compatibility)
        Object.keys(assignments).forEach(key => {
            // If value is an object (old format), convert to array (new format)
            if (assignments[key] && !Array.isArray(assignments[key])) {
                assignments[key] = [assignments[key]];
            }
        });
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('assignments', JSON.stringify(assignments));
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Format date
function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Get week key for current week
function getWeekKey(weekStart) {
    return weekStart.toISOString().split('T')[0];
}

// Calculate daily project hours for a team member
function calculateDailyProjectHours(member) {
    // 8 hours per day * availability % * effectiveness %
    const baseHours = 8;
    const availableHours = baseHours * (member.availability / 100) * (member.effectiveness / 100);
    return Math.round(availableHours * 10) / 10; // Round to 1 decimal place
}

// Calculate total assigned hours for a cell
function getTotalAssignedHours(cellAssignments) {
    if (!cellAssignments || cellAssignments.length === 0) return 0;
    return cellAssignments.reduce((sum, assignment) => sum + assignment.hours, 0);
}

// Helper function to get week start and day index for a given date
function getWeekStartAndDayIndex(date) {
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const dayIndex = date.getDay() - 1; // Monday = 0, Friday = 4
    return { weekStart, dayIndex };
}

// Initialize the app
function init() {
    loadData();
    setupEventListeners();
    renderMembers();
    renderProjects();
    renderPlannerGrid();
    updateWeekDisplay();
}

// Setup event listeners
function setupEventListeners() {
    // Member button
    document.getElementById('addMemberBtn').addEventListener('click', () => {
        openMemberModal();
    });

    // Project button
    document.getElementById('addProjectBtn').addEventListener('click', () => {
        openProjectModal();
    });

    // Week navigation
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderPlannerGrid();
        updateWeekDisplay();
    });

    document.getElementById('nextWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderPlannerGrid();
        updateWeekDisplay();
    });

    // Member form
    document.getElementById('memberForm').addEventListener('submit', handleMemberSubmit);

    // Project form
    document.getElementById('projectForm').addEventListener('submit', handleProjectSubmit);

    // Assignment form
    document.getElementById('assignmentForm').addEventListener('submit', handleAssignmentSubmit);

    // Assignment mode toggle
    document.addEventListener('change', (e) => {
        if (e.target.name === 'assignmentMode') {
            toggleAssignmentMode();
        }
    });

    // Update preview when percentage or days change
    document.addEventListener('input', (e) => {
        if (e.target.id === 'assignPercentage' || e.target.id === 'assignDays') {
            updateMultiDayPreview();
        }
    });

    // Modal close buttons
    document.querySelectorAll('.close, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// Update week display
function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    document.getElementById('currentWeekDisplay').textContent = 
        `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`;
}

// Render team members list
function renderMembers() {
    const container = document.getElementById('membersList');
    
    if (teamMembers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No team members yet</p></div>';
        return;
    }

    container.innerHTML = teamMembers.map(member => {
        const dailyProjectHours = calculateDailyProjectHours(member);
        return `
        <div class="item-card">
            <div class="item-info">
                <div class="item-name">${member.name}</div>
                <div class="item-details">
                    Avail: ${member.availability}% | 
                    Eff: ${member.effectiveness}% | 
                    Project Hours/Day: ${dailyProjectHours}h
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="editMember('${member.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteMember('${member.id}')">Delete</button>
            </div>
        </div>
    `;
    }).join('');
}

// Render projects list
function renderProjects() {
    const container = document.getElementById('projectsList');
    
    if (projects.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No projects yet</p></div>';
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="item-card project-card" style="--project-color: ${project.color}">
            <div class="item-info">
                <div class="item-name">${project.name}</div>
                <div class="item-details">Total Hours: ${project.hours}h</div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="editProject('${project.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteProject('${project.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render planner grid
function renderPlannerGrid() {
    const container = document.getElementById('plannerGrid');
    
    if (teamMembers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Add team members to start planning</p></div>';
        return;
    }

    const weekKey = getWeekKey(currentWeekStart);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    
    let html = '<table class="grid-table"><thead><tr>';
    html += '<th class="member-header">Team Member</th>';
    
    // Day headers
    for (let i = 0; i < 5; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        html += `<th>${days[i]}<br><small>${formatDate(date)}</small></th>`;
    }
    html += '</tr></thead><tbody>';
    
    // Member rows
    teamMembers.forEach(member => {
        const dailyProjectHours = calculateDailyProjectHours(member);
        html += '<tr>';
        html += `<td class="member-header">
            <div class="member-header-cell">
                <span class="member-name">${member.name}</span>
                <span class="member-stats">
                    Avail: ${member.availability}% | Eff: ${member.effectiveness}%
                    <br>Project Hours/Day: ${dailyProjectHours}h
                </span>
            </div>
        </td>`;
        
        // Day cells
        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            const cellKey = `${member.id}-${weekKey}-${dayIndex}`;
            const cellAssignments = assignments[cellKey] || [];
            const totalAssigned = getTotalAssignedHours(cellAssignments);
            const isOverAllocated = totalAssigned > dailyProjectHours;
            
            html += `<td class="calendar-cell ${isOverAllocated ? 'over-allocated' : ''}" onclick="openAssignmentModal('${member.id}', ${dayIndex})">`;
            
            if (cellAssignments.length > 0) {
                cellAssignments.forEach(assignment => {
                    const project = projects.find(p => p.id === assignment.projectId);
                    if (project) {
                        html += `
                            <div class="assignment" style="background-color: ${project.color}">
                                <div class="assignment-name">${project.name}</div>
                                <div class="assignment-hours">${assignment.hours}h</div>
                            </div>
                        `;
                    }
                });
                
                // Show capacity bar
                html += `
                    <div class="capacity-bar">
                        <div class="capacity-used" style="width: ${Math.min(100, (totalAssigned / dailyProjectHours) * 100)}%"></div>
                    </div>
                    <div class="capacity-text ${isOverAllocated ? 'over-limit' : ''}">${totalAssigned}h / ${dailyProjectHours}h</div>
                `;
            }
            
            html += '</td>';
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Modal functions
function openMemberModal(memberId = null) {
    const modal = document.getElementById('memberModal');
    const form = document.getElementById('memberForm');
    const title = document.getElementById('memberModalTitle');
    
    form.reset();
    
    if (memberId) {
        const member = teamMembers.find(m => m.id === memberId);
        if (member) {
            title.textContent = 'Edit Team Member';
            document.getElementById('memberName').value = member.name;
            document.getElementById('memberAvailability').value = member.availability;
            document.getElementById('memberEffectiveness').value = member.effectiveness;
            form.dataset.editId = memberId;
        }
    } else {
        title.textContent = 'Add Team Member';
        delete form.dataset.editId;
    }
    
    modal.classList.add('active');
}

function openProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');
    const title = document.getElementById('projectModalTitle');
    
    form.reset();
    
    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            title.textContent = 'Edit Project';
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectColor').value = project.color;
            document.getElementById('projectHours').value = project.hours;
            form.dataset.editId = projectId;
        }
    } else {
        title.textContent = 'Add Project';
        delete form.dataset.editId;
    }
    
    modal.classList.add('active');
}

function openAssignmentModal(memberId, dayIndex) {
    const modal = document.getElementById('assignmentModal');
    const form = document.getElementById('assignmentForm');
    const select = document.getElementById('assignProject');
    const currentAssignmentsDiv = document.getElementById('currentAssignments');
    
    // Populate project dropdown
    select.innerHTML = '<option value="">Select a project...</option>' +
        projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    const weekKey = getWeekKey(currentWeekStart);
    const cellKey = `${memberId}-${weekKey}-${dayIndex}`;
    const cellAssignments = assignments[cellKey] || [];
    
    // Display current assignments
    if (cellAssignments.length > 0) {
        let assignmentsHtml = '<h3 style="margin-bottom: 10px; font-size: 1.1rem; color: #667eea;">Current Assignments</h3>';
        assignmentsHtml += '<div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 15px;">';
        cellAssignments.forEach((assignment, index) => {
            const project = projects.find(p => p.id === assignment.projectId);
            if (project) {
                assignmentsHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-bottom: 8px; background: white; border-radius: 4px; border-left: 4px solid ${project.color}">
                        <div>
                            <strong>${project.name}</strong>
                            <span style="color: #666; margin-left: 10px;">${assignment.hours}h</span>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button type="button" class="btn btn-secondary btn-small" onclick="moveAssignment('${memberId}', ${dayIndex}, ${index})">Move</button>
                            <button type="button" class="btn btn-danger btn-small" onclick="removeAssignment('${memberId}', ${dayIndex}, ${index})">Remove</button>
                        </div>
                    </div>
                `;
            }
        });
        assignmentsHtml += '</div>';
        currentAssignmentsDiv.innerHTML = assignmentsHtml;
    } else {
        currentAssignmentsDiv.innerHTML = '<p style="color: #999; font-style: italic; margin-bottom: 15px;">No assignments for this day yet.</p>';
    }
    
    form.reset();
    form.dataset.memberId = memberId;
    form.dataset.dayIndex = dayIndex;
    
    // Reset to single day mode
    document.querySelector('input[name="assignmentMode"][value="single"]').checked = true;
    toggleAssignmentMode();
    
    modal.classList.add('active');
}

// Toggle between single-day and multi-day assignment modes
function toggleAssignmentMode() {
    const mode = document.querySelector('input[name="assignmentMode"]:checked').value;
    const singleDayFields = document.getElementById('singleDayFields');
    const multiDayFields = document.getElementById('multiDayFields');
    const hoursInput = document.getElementById('assignHours');
    const percentageInput = document.getElementById('assignPercentage');
    const daysInput = document.getElementById('assignDays');
    
    if (mode === 'single') {
        singleDayFields.style.display = 'block';
        multiDayFields.style.display = 'none';
        hoursInput.required = true;
        percentageInput.required = false;
        daysInput.required = false;
    } else {
        singleDayFields.style.display = 'none';
        multiDayFields.style.display = 'block';
        hoursInput.required = false;
        percentageInput.required = true;
        daysInput.required = true;
        updateMultiDayPreview();
    }
}

// Update multi-day assignment preview
function updateMultiDayPreview() {
    const form = document.getElementById('assignmentForm');
    const memberId = form.dataset.memberId;
    const startDayIndex = parseInt(form.dataset.dayIndex);
    const percentage = parseFloat(document.getElementById('assignPercentage').value) || 0;
    const numDays = parseInt(document.getElementById('assignDays').value) || 0;
    const preview = document.getElementById('multiDayPreview');
    const previewContent = document.getElementById('multiDayPreviewContent');
    
    if (!memberId || percentage <= 0 || numDays <= 0) {
        preview.style.display = 'none';
        return;
    }
    
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) {
        preview.style.display = 'none';
        return;
    }
    
    const dailyProjectHours = calculateDailyProjectHours(member);
    const hoursPerDay = Math.round((dailyProjectHours * percentage / 100) * 10) / 10;
    
    // Calculate which days will be assigned (matching actual assignment logic)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const assignedDays = [];
    let currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + startDayIndex);
    
    let daysAssigned = 0;
    let iterations = 0;
    const maxIterations = numDays * 3; // Safety limit
    
    while (daysAssigned < numDays && iterations < maxIterations) {
        const dayOfWeek = currentDate.getDay();
        
        // Only assign to weekdays (Monday = 1, Friday = 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const weeksDiff = Math.floor((currentDate - currentWeekStart) / (7 * 24 * 60 * 60 * 1000));
            assignedDays.push({
                day: days[dayOfWeek - 1],
                week: weeksDiff
            });
            daysAssigned++;
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        iterations++;
    }
    
    let previewHtml = `<strong>${hoursPerDay}h per day</strong> (${percentage}% of ${dailyProjectHours}h)<br>`;
    previewHtml += `Total: <strong>${Math.round(hoursPerDay * numDays * 10) / 10}h</strong> across ${numDays} weekdays<br>`;
    
    if (assignedDays.length <= 10) {
        previewHtml += '<div style="margin-top: 5px; font-size: 0.85rem; color: #666;">';
        previewHtml += 'Days: ';
        const daysSummary = assignedDays.map(d => {
            if (d.week === 0) return d.day;
            return `${d.day} (Week +${d.week})`;
        }).join(', ');
        previewHtml += daysSummary;
        previewHtml += '</div>';
    }
    
    previewContent.innerHTML = previewHtml;
    preview.style.display = 'block';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Form handlers
function handleMemberSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('memberName').value;
    const availability = parseInt(document.getElementById('memberAvailability').value);
    const effectiveness = parseInt(document.getElementById('memberEffectiveness').value);
    
    const editId = e.target.dataset.editId;
    
    if (editId) {
        const member = teamMembers.find(m => m.id === editId);
        if (member) {
            member.name = name;
            member.availability = availability;
            member.effectiveness = effectiveness;
        }
    } else {
        teamMembers.push({
            id: generateId(),
            name,
            availability,
            effectiveness
        });
    }
    
    saveData();
    renderMembers();
    renderPlannerGrid();
    closeAllModals();
}

function handleProjectSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('projectName').value;
    const color = document.getElementById('projectColor').value;
    const hours = parseFloat(document.getElementById('projectHours').value);
    
    const editId = e.target.dataset.editId;
    
    if (editId) {
        const project = projects.find(p => p.id === editId);
        if (project) {
            project.name = name;
            project.color = color;
            project.hours = hours;
        }
    } else {
        projects.push({
            id: generateId(),
            name,
            color,
            hours
        });
    }
    
    saveData();
    renderProjects();
    renderPlannerGrid();
    closeAllModals();
}

function handleAssignmentSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const memberId = form.dataset.memberId;
    const startDayIndex = parseInt(form.dataset.dayIndex);
    const projectId = document.getElementById('assignProject').value;
    const mode = document.querySelector('input[name="assignmentMode"]:checked').value;
    
    if (!projectId) {
        alert('Please select a project');
        return;
    }
    
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) {
        alert('Member not found');
        return;
    }
    
    if (mode === 'single') {
        // Single day assignment (existing logic)
        const hours = parseFloat(document.getElementById('assignHours').value);
        addSingleAssignment(memberId, startDayIndex, projectId, hours);
    } else {
        // Multi-day assignment (new logic)
        const percentage = parseFloat(document.getElementById('assignPercentage').value);
        const numDays = parseInt(document.getElementById('assignDays').value);
        addMultiDayAssignment(memberId, startDayIndex, projectId, percentage, numDays);
    }
}

// Add a single assignment to a specific day
function addSingleAssignment(memberId, dayIndex, projectId, hours) {
    const weekKey = getWeekKey(currentWeekStart);
    const cellKey = `${memberId}-${weekKey}-${dayIndex}`;
    
    // Initialize array if it doesn't exist
    if (!assignments[cellKey]) {
        assignments[cellKey] = [];
    }
    
    // Check if project is already assigned to this day
    const alreadyAssigned = assignments[cellKey].some(a => a.projectId === projectId);
    if (alreadyAssigned) {
        alert('This project is already assigned to this day. Please remove it first or choose a different project.');
        return;
    }
    
    // Check if adding this assignment would exceed available hours
    const member = teamMembers.find(m => m.id === memberId);
    const dailyProjectHours = calculateDailyProjectHours(member);
    const currentTotal = getTotalAssignedHours(assignments[cellKey]);
    const newTotal = currentTotal + hours;
    
    if (newTotal > dailyProjectHours) {
        const canProceed = confirm(
            `Warning: Adding ${hours}h will result in ${newTotal}h assigned, ` +
            `which exceeds the available ${dailyProjectHours}h for this day.\n\n` +
            `Do you want to proceed anyway?`
        );
        if (!canProceed) {
            return;
        }
    }
    
    // Add new assignment to the array
    assignments[cellKey].push({
        projectId,
        hours
    });
    
    saveData();
    renderPlannerGrid();
    
    // Refresh the modal to show the updated list
    openAssignmentModal(memberId, dayIndex);
}

// Add multi-day assignment across multiple days
function addMultiDayAssignment(memberId, startDayIndex, projectId, percentage, numDays) {
    const member = teamMembers.find(m => m.id === memberId);
    const dailyProjectHours = calculateDailyProjectHours(member);
    const hoursPerDay = Math.round((dailyProjectHours * percentage / 100) * 10) / 10;
    
    // Calculate which days will be assigned
    const assignmentDates = [];
    let currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + startDayIndex);
    
    let daysAssigned = 0;
    let iterations = 0;
    const maxIterations = numDays * 3; // Safety limit to prevent infinite loops
    
    while (daysAssigned < numDays && iterations < maxIterations) {
        const dayOfWeek = currentDate.getDay();
        
        // Only assign to weekdays (Monday = 1, Friday = 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            assignmentDates.push(new Date(currentDate));
            daysAssigned++;
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        iterations++;
    }
    
    if (iterations >= maxIterations) {
        alert('Unable to complete assignment: Maximum iteration limit reached. Please try with fewer days.');
        return;
    }
    
    // Check for conflicts and over-allocation
    const conflicts = [];
    const overAllocations = [];
    
    assignmentDates.forEach(date => {
        const { weekStart, dayIndex } = getWeekStartAndDayIndex(date);
        const weekKey = getWeekKey(weekStart);
        const cellKey = `${memberId}-${weekKey}-${dayIndex}`;
        
        // Check for existing assignment of this project
        if (assignments[cellKey]) {
            const alreadyAssigned = assignments[cellKey].some(a => a.projectId === projectId);
            if (alreadyAssigned) {
                conflicts.push(formatDate(date));
            }
        }
        
        // Check for over-allocation
        const currentTotal = getTotalAssignedHours(assignments[cellKey] || []);
        const newTotal = currentTotal + hoursPerDay;
        if (newTotal > dailyProjectHours) {
            overAllocations.push({
                date: formatDate(date),
                current: currentTotal,
                new: newTotal,
                available: dailyProjectHours
            });
        }
    });
    
    // Show warnings if there are conflicts or over-allocations
    if (conflicts.length > 0) {
        alert(`This project is already assigned on the following days:\n${conflicts.join(', ')}\n\nPlease remove those assignments first.`);
        return;
    }
    
    if (overAllocations.length > 0) {
        const overMsg = overAllocations.slice(0, 5).map(o => 
            `${o.date}: ${o.new}h (exceeds ${o.available}h available)`
        ).join('\n');
        
        let message = `Warning: This assignment will exceed available hours on ${overAllocations.length} day(s):\n\n${overMsg}`;
        if (overAllocations.length > 5) {
            message += `\n... and ${overAllocations.length - 5} more days`;
        }
        message += '\n\nDo you want to proceed anyway?';
        
        const canProceed = confirm(message);
        if (!canProceed) {
            return;
        }
    }
    
    // Create assignments
    let assignmentsCreated = 0;
    assignmentDates.forEach(date => {
        const { weekStart, dayIndex } = getWeekStartAndDayIndex(date);
        const weekKey = getWeekKey(weekStart);
        const cellKey = `${memberId}-${weekKey}-${dayIndex}`;
        
        // Initialize array if it doesn't exist
        if (!assignments[cellKey]) {
            assignments[cellKey] = [];
        }
        
        // Add assignment
        assignments[cellKey].push({
            projectId,
            hours: hoursPerDay
        });
        assignmentsCreated++;
    });
    
    saveData();
    renderPlannerGrid();
    closeAllModals();
    
    alert(`Successfully created ${assignmentsCreated} assignments across ${numDays} weekdays (${hoursPerDay}h per day).`);
}

function removeAssignment(memberId, dayIndex, assignmentIndex) {
    const weekKey = getWeekKey(currentWeekStart);
    const cellKey = `${memberId}-${weekKey}-${dayIndex}`;
    
    if (assignments[cellKey]) {
        // Remove the assignment at the specified index
        assignments[cellKey].splice(assignmentIndex, 1);
        
        // Clean up if array is empty
        if (assignments[cellKey].length === 0) {
            delete assignments[cellKey];
        }
        
        saveData();
        renderPlannerGrid();
        
        // Refresh the modal to show the updated list
        openAssignmentModal(memberId, dayIndex);
    }
}

// Move assignment to a different member/day
function moveAssignment(sourceMemberId, sourceDayIndex, assignmentIndex) {
    const weekKey = getWeekKey(currentWeekStart);
    const sourceCellKey = `${sourceMemberId}-${weekKey}-${sourceDayIndex}`;
    
    if (!assignments[sourceCellKey] || !assignments[sourceCellKey][assignmentIndex]) {
        alert('Assignment not found');
        return;
    }
    
    const assignment = assignments[sourceCellKey][assignmentIndex];
    const project = projects.find(p => p.id === assignment.projectId);
    
    if (!project) {
        alert('Project not found');
        return;
    }
    
    // Create a modal for selecting target member and day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let options = '<option value="">Select target...</option>';
    
    teamMembers.forEach(member => {
        for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
            const targetCellKey = `${member.id}-${weekKey}-${dayIdx}`;
            // Don't show the source as an option
            if (targetCellKey !== sourceCellKey) {
                options += `<option value="${member.id},${dayIdx}">${member.name} - ${days[dayIdx]}</option>`;
            }
        }
    });
    
    const targetSelection = prompt(
        `Move "${project.name}" (${assignment.hours}h) to:\n\n` +
        `Enter the number for your choice:\n` +
        teamMembers.map((member, mIdx) => {
            return days.map((day, dIdx) => {
                const cellKey = `${member.id}-${weekKey}-${dIdx}`;
                if (cellKey !== sourceCellKey) {
                    const num = (mIdx * 5) + dIdx + 1;
                    return `${num}. ${member.name} - ${day}`;
                }
                return null;
            }).filter(x => x).join('\n');
        }).join('\n') + '\n\n(Or Cancel to abort)'
    );
    
    if (!targetSelection) {
        return; // User cancelled
    }
    
    const targetNum = parseInt(targetSelection) - 1;
    if (isNaN(targetNum) || targetNum < 0) {
        alert('Invalid selection');
        return;
    }
    
    // Calculate target member and day from the number
    const targetMemberIdx = Math.floor(targetNum / 5);
    const targetDayIdx = targetNum % 5;
    
    // Validate the selection is within bounds
    if (targetMemberIdx >= teamMembers.length || targetMemberIdx < 0 || targetDayIdx < 0 || targetDayIdx >= 5) {
        alert('Invalid selection');
        return;
    }
    
    const targetMember = teamMembers[targetMemberIdx];
    const targetCellKey = `${targetMember.id}-${weekKey}-${targetDayIdx}`;
    
    // Check if target would be over-allocated
    const dailyProjectHours = calculateDailyProjectHours(targetMember);
    const currentTotal = getTotalAssignedHours(assignments[targetCellKey] || []);
    const newTotal = currentTotal + assignment.hours;
    
    if (newTotal > dailyProjectHours) {
        const canProceed = confirm(
            `Warning: Moving this assignment will result in ${newTotal}h assigned to ` +
            `${targetMember.name} on ${days[targetDayIdx]}, which exceeds the available ` +
            `${dailyProjectHours}h.\n\nDo you want to proceed anyway?`
        );
        if (!canProceed) {
            return;
        }
    }
    
    // Remove from source
    assignments[sourceCellKey].splice(assignmentIndex, 1);
    if (assignments[sourceCellKey].length === 0) {
        delete assignments[sourceCellKey];
    }
    
    // Add to target
    if (!assignments[targetCellKey]) {
        assignments[targetCellKey] = [];
    }
    assignments[targetCellKey].push({
        projectId: assignment.projectId,
        hours: assignment.hours
    });
    
    saveData();
    renderPlannerGrid();
    closeAllModals();
    
    alert(`Moved "${project.name}" to ${targetMember.name} - ${days[targetDayIdx]}`);
}

// CRUD operations
function editMember(id) {
    openMemberModal(id);
}

function deleteMember(id) {
    if (confirm('Are you sure you want to delete this team member?')) {
        teamMembers = teamMembers.filter(m => m.id !== id);
        
        // Clean up assignments for this member
        Object.keys(assignments).forEach(key => {
            if (key.startsWith(id + '-')) {
                delete assignments[key];
            }
        });
        
        saveData();
        renderMembers();
        renderPlannerGrid();
    }
}

function editProject(id) {
    openProjectModal(id);
}

function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        projects = projects.filter(p => p.id !== id);
        
        // Clean up assignments for this project
        Object.keys(assignments).forEach(key => {
            if (Array.isArray(assignments[key])) {
                // New format: filter out assignments with this project
                assignments[key] = assignments[key].filter(a => a.projectId !== id);
                // Clean up if array is empty
                if (assignments[key].length === 0) {
                    delete assignments[key];
                }
            } else if (assignments[key] && assignments[key].projectId === id) {
                // Old format (shouldn't happen after migration, but just in case)
                delete assignments[key];
            }
        });
        
        saveData();
        renderProjects();
        renderPlannerGrid();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
