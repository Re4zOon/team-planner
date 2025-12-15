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

// Calculate total scheduled hours for a project across all assignments
function getProjectScheduledHours(projectId) {
    let totalScheduled = 0;
    Object.keys(assignments).forEach(cellKey => {
        const cellAssignments = assignments[cellKey];
        if (Array.isArray(cellAssignments)) {
            cellAssignments.forEach(assignment => {
                if (assignment.projectId === projectId) {
                    totalScheduled += assignment.hours;
                }
            });
        }
    });
    return totalScheduled;
}

// Calculate remaining hours for a project
function getProjectRemainingHours(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 0;
    const scheduled = getProjectScheduledHours(projectId);
    return Math.max(0, project.hours - scheduled);
}

// Calculate ETA for a project based on assignments
function getProjectETA(projectId) {
    const remaining = getProjectRemainingHours(projectId);
    if (remaining <= 0) return 'Completed';
    
    // Find the last assignment date for this project
    let lastAssignmentDate = null;
    
    Object.keys(assignments).forEach(cellKey => {
        const cellAssignments = assignments[cellKey];
        if (Array.isArray(cellAssignments)) {
            cellAssignments.forEach(assignment => {
                if (assignment.projectId === projectId) {
                    // Parse the cell key: "memberId-weekKey-dayIndex"
                    const parts = cellKey.split('-');
                    if (parts.length >= 3) {
                        const dayIndex = parseInt(parts[parts.length - 1]);
                        const weekKey = parts.slice(1, -1).join('-');
                        const weekDate = new Date(weekKey);
                        const assignmentDate = new Date(weekDate);
                        assignmentDate.setDate(assignmentDate.getDate() + dayIndex);
                        
                        if (!lastAssignmentDate || assignmentDate > lastAssignmentDate) {
                            lastAssignmentDate = assignmentDate;
                        }
                    }
                }
            });
        }
    });
    
    if (!lastAssignmentDate) return 'Not scheduled';
    
    // Return the date of the last assignment as the ETA
    return formatDate(lastAssignmentDate);
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

    container.innerHTML = projects.map(project => {
        const totalHours = project.hours;
        const scheduledHours = getProjectScheduledHours(project.id);
        const remainingHours = getProjectRemainingHours(project.id);
        const progressPercent = totalHours > 0 ? Math.min(100, (scheduledHours / totalHours) * 100) : 0;
        const eta = getProjectETA(project.id);
        
        return `
        <div class="item-card project-card" style="--project-color: ${project.color}">
            <div class="item-info">
                <div class="item-name">${project.name}</div>
                <div class="item-details">
                    Total: ${totalHours}h | Scheduled: ${scheduledHours}h | Remaining: ${remainingHours}h
                    <br>
                    <span class="project-eta">ETA: ${eta}</span>
                </div>
                <div class="project-progress-bar">
                    <div class="project-progress-fill" style="width: ${progressPercent}%; background-color: ${project.color}"></div>
                </div>
                <div class="project-progress-text">${progressPercent.toFixed(0)}% scheduled</div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="editProject('${project.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteProject('${project.id}')">Delete</button>
            </div>
        </div>
    `;
    }).join('');
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
    
    modal.classList.add('active');
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
    const dayIndex = parseInt(form.dataset.dayIndex);
    const projectId = document.getElementById('assignProject').value;
    const hours = parseFloat(document.getElementById('assignHours').value);
    
    if (!projectId) {
        alert('Please select a project');
        return;
    }
    
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
    renderProjects();
    renderPlannerGrid();
    
    // Refresh the modal to show the updated list
    openAssignmentModal(memberId, dayIndex);
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
        renderProjects();
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
    renderProjects();
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
