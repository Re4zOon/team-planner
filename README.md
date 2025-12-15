# Team Planner

A calendar-based team organization and project planning tool. Plan your team's work with a visual grid showing team members on one axis and calendar days on the other.

## Features

- **Calendar-Based Planning**: Week-by-week view with team members on rows and days on columns
- **Team Member Management**: Add team members with customizable attributes:
  - **Availability (%)**: Percentage of time available for project work (remaining time is assumed to be maintenance)
  - **Effectiveness (%)**: Effectiveness multiplier (e.g., 75% for junior developers)
  - **Daily Project Hours**: Automatically calculated as 8h × Availability × Effectiveness
- **Project Management**: Create projects with:
  - Name and color coding
  - Total work hours required
- **Project Assignment**: Click any calendar cell to assign projects to team members for specific days
- **Capacity Management**: 
  - Visual indicators show assigned hours vs. available project hours
  - Warnings when assignments exceed available capacity
  - Ability to move assignments between team members and days
- **Data Persistence**: All data is saved in browser localStorage

## Getting Started

### Installation

No installation required! This is a standalone web application.

### Usage

1. **Open the application**: Simply open `index.html` in your web browser
2. **Add Team Members**: Click "Add Member" to create team members with their availability, effectiveness, and maintenance percentages
3. **Add Projects**: Click "Add Project" to create projects with work hours and color coding
4. **Plan Work**: Click on any calendar cell to assign a project to a team member for that day
5. **Navigate Weeks**: Use "Previous Week" and "Next Week" buttons to navigate through the calendar

## Example Use Cases

### Team Member Configuration
- **Junior Developer**: 
  - Availability: 100%
  - Effectiveness: 75% (takes longer to complete tasks)
  - Daily Project Hours: 8h × 100% × 75% = 6h
  - (Remaining 2h equivalent is assumed for maintenance/learning)
  
- **Senior Developer with Part-Time Availability**:
  - Availability: 50% (working part-time)
  - Effectiveness: 100%
  - Daily Project Hours: 8h × 50% × 100% = 4h
  - (Remaining 4h is non-working time or other commitments)

### Project Planning
- Create a project "Feature X" with 80 work hours
- Assign different team members to work on it throughout the week
- Track hours allocated per day per team member

## Technical Details

- **Frontend**: Pure HTML, CSS, and JavaScript (no frameworks required)
- **Storage**: Browser localStorage for data persistence
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

## File Structure

```
team-planner/
├── index.html      # Main HTML structure
├── styles.css      # Styling and layout
├── app.js          # Application logic and data management
└── README.md       # This file
```

## Future Enhancements

Potential improvements for future versions:
- Export/import data (JSON/CSV)
- Team member utilization reports
- Project completion tracking
- Multi-week project views
- Drag and drop assignments
- Mobile responsive improvements
- Dark mode

## License

MIT License - Feel free to use and modify as needed.