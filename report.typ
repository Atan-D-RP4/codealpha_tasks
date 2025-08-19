// Document configuration
#set document(title: "MERN Stack Internship Report", author: "Student Name")
#set page(
  paper: "a4",
  margin: (top: 1.2in, bottom: 1in, left: 1.25in, right: 1in),
  numbering: "1",
  number-align: center,

  background: place(dx: 0.25in, dy: 0.25in, rect(
    width: 100% - 0.5in,
    height: 100% - 0.5in,
    stroke: 1pt + black,
    fill: none,
  )),
)
#set text(font: "", size: 14pt)
#set heading(numbering: "1.")
#set par(justify: true, leading: 0.65em, first-line-indent: 0.5in)

// Helper function for automatic table generation
#let auto-table(data, headers: (), caption: none, align: center) = {
  let table-content = table(
    columns: headers.len(),
    align: align,
    stroke: 0.5pt,
    fill: (x, y) => if y == 0 { gray.lighten(80%) } else { none },
    ..headers.map(h => [*#h*]),
    ..data.flatten()
  )

  if caption != none {
    figure(table-content, caption: caption, kind: table)
  } else {
    table-content
  }
}

// Title Page
#align(center)[
  #text(size: 16pt, weight: "bold")[
    An Internship Course Report on
  ]

  #v(0.5cm)

  #text(size: 18pt, weight: "bold")[
    MERN DEVELOPMENT INTERNSHIP
  ]

  #v(0.5cm)

  #text(size: 14pt, weight: "bold")[
    Department of Computer Science and Engineering
  ]

  #v(1cm)

  #align(center + horizon)[#image("./anits_logo.png")]

  #v(1cm)

  #text(size: 14pt, weight: "bold")[
    Anil Neerukonda Institute of Technology and Sciences
  ]
  #v(0.1cm)
  #text(size: 12pt)[(Affiliated to Andhra University)]
  #text(size: 12pt)[Sangivalasa, Visakhapatnam-531162]

  #v(0.5cm)

  #text(size: 12pt, weight: "bold")[Submitted by]

  #v(0.5cm)

  #text(size: 16pt, weight: "bold")[D. Sai Venkata Chaitanya - A22126510144]

  #v(2cm)

  #grid(
    columns: (1fr, 1fr),
    gutter: 1cm,
    [
      #text(size: 12pt)[Internship Reviewer]
      #linebreak()
      #text(size: 12pt)[Dr. S. Anusha]
      #linebreak()
      #text(size: 12pt)[M.Tech, Ph.D]
      #linebreak()
      #text(size: 12pt)[(Asst. Professor)]
    ],
    [
      #text(size: 12pt)[Summer Internship Coordinator]
      #linebreak()
      #text(size: 12pt)[Mrs. G. Gowripushpa]
      #linebreak()
      #text(size: 12pt)[M.Tech]
      #linebreak()
      #text(size: 12pt)[(Assistant professor)]
    ],
  )

  #v(1cm)

  #pagebreak()
  #text(size: 14pt, weight: "bold")[
    ANIL NEERUKONDA INSTITUTE OF TECHNOLOGY AND SCIENCES
  ]
  #linebreak()
  #text(size: 13pt)[SANGIVALASA, VISAKHAPATNAM – 531162]
  #linebreak()
  #text(size: 13pt)[2022-2026]
]

// Bonafide Certificate Page
#align(center)[
  #align(center + horizon)[#image("./anits_logo.png")]

  #v(1cm)

  #text(size: 16pt, weight: "bold")[BONAFIDE CERTIFICATE]
]

#v(1cm)

This is to certify that the course training on Web Development, work entitled
"MERN STACK DEVELOPER INTERNSHIP BY CODEC TECHNOLOGIES" which is a bonafide work
carried out by Dubakula Sai Venkata Chaitanya bearing Register No. A22126510134
respectively in fulfilment of Summer Internship Training in IV/IV B. Tech, 1st
Semester in Computer Science Engineering of the ANITS, Visakhapatnam during the
year 2022-2026. It is certified that all corrections indicated for internal
assessment have been incorporated to account.

#v(2cm)

#align(right)[
  #text(size: 12pt, weight: "bold")[Dr. G. Srinivas]
  #linebreak()
  #text(size: 12pt, weight: "bold")[(Head of the Department)]
  #linebreak()
  #text(size: 12pt, weight: "bold")[Computer Science and Engineering]
  #linebreak()
  #text(size: 12pt, weight: "bold")[ANITS]
]

#pagebreak()

// Course Completion Certificate Page
#align(center)[
  #text(size: 16pt, weight: "bold")[COURSE COMPLETION CERTIFICATE]

  #v(1cm)

  #rect(width: 6in, height: 4in, stroke: 1pt + black, fill: gray.lighten(90%))[
    #align(center + horizon)[_Certificate Image Placeholder_]
  ]
]

#pagebreak()

// Declaration Page
#align(center)[
  #text(size: 16pt, weight: "bold")[DECLARATION]
]

#v(1cm)

D. Chaitanya, bearing College Register No. A22126510144 respectively, do hereby
declare that this course training on "MERN Stack Development" is carried out by
me. I hereby declare that the original summer internship is done by me as per
the requirements of the training.

#v(3cm)

#grid(
  columns: (1fr, 1fr),
  gutter: 2cm,
  [
    *Station:* Sangivalasa
    #linebreak()
    *Date:* 18-08-2025
  ],
  [
    *D. Sai Venkata Chaitanya*
    #linebreak()
    *(A22126510134)*
    #linebreak()
    *(IV/IV CSE-C)*
  ],
)

#pagebreak()

// Acknowledgment Page
#align(center)[
  #text(size: 16pt, weight: "bold")[ACKNOWLEDGMENT]
]

#v(1cm)

An endeavour over a long period can be successful with the advice and support of many well-wishers. We take this opportunity to express our gratitude and appreciation to all of them.

We owe our tributes to the Head of the Department, Computer Science & Engineering, ANITS, for his valuable support and guidance during the period of project implementation.

We express our warm and sincere thanks for the encouragement, untiring guidance and the confidence they had shown in us. We are immensely indebted for their valuable guidance throughout our project.

We also thank all the staff members of the CSE department for their valuable advice. We also thank the Supporting staff for providing resources as and when required.

#v(2cm)

#align(right)[
  *D. Sai Venkata Chaitanya*
  #linebreak()
  *A22126510134*
  #linebreak()
  *(IV/IV CSE-C)*
]

#pagebreak()

// Table of Contents
#align(center)[
  #text(size: 16pt, weight: "bold")[TABLE OF CONTENTS]
]

#v(1cm)

// Auto-generated table of contents
#outline(
  title: none, // We already have the title above
  indent: auto,
)

#pagebreak()

// TEMPLATE SECTIONS FOR MIDDLE CONTENT

// Section Template 1: Introduction
= Introduction

== What is the MERN stack?

The MERN stack is a popular web development framework that combines four
powerful technologies: MongoDB, Express.js, React.js, and Node.js. This stack
allows developers to build full-stack applications using JavaScript for both the
client-side and server-side, providing a seamless development experience.

== What is the need for MERN STACK in the IT industries?

The MERN stack is widely adopted in the IT industry due to its efficiency,
scalability, and flexibility. It enables developers to create dynamic,
high-performance web applications with real-time capabilities. The use of a
single programming language (JavaScript) across the stack simplifies development
and reduces context switching, making it easier to manage codebases and
collaborate on projects. Additionally, the MERN stack's robust ecosystem and
community support provide developers with a wealth of resources, libraries, and
tools to enhance productivity and streamline development processes.


== Modern best practices in MERN stack development

These days though, most developers teams understand that the best way to utilize
the MERN stack whilst ensuring scalability, maintainability, and performance is
to use TypeScript, a superset of JavaScript that adds static typing. TypeScript
helps catch errors at compile time, provides better tooling support, and
improves code readability. It also enhances collaboration among team members by
providing clearer interfaces and type definition. Node.js now having stable,
built-in support for TypeScript, as of version v23.6.0, means that dev-teams
have even fewer reasons to not use TypeScript in their MERN stack applications.

#pagebreak()

// Section Template 2: Technology Deep Dive
= MongoDB

== Introduction to NoSQL Databases

NoSQL databases are designed to handle large
volumes of unstructured or semi-structured data. Unlike traditional relational
databases, NoSQL databases provide flexibility in data modeling, allowing for
dynamic schemas and horizontal scalability. They are particularly well-suited
for applications that require high availability, real-time data processing, and
the ability to handle diverse data types.



// Image placeholder
#figure(
  rect(width: 4in, height: 2.5in, stroke: 1pt + black, fill: gray.lighten(90%))[
    #align(center + horizon)[_Technology Diagram Placeholder_]
  ],
  caption: "Technology Architecture Overview",
)

== Key Features

// Automatic list generation
#let features_data = (
  ("Feature 1", "Description of feature 1"),
  ("Feature 2", "Description of feature 2"),
  ("Feature 3", "Description of feature 3"),
  ("Feature 4", "Description of feature 4"),
)

#auto-table(
  features_data,
  headers: ("Feature", "Description"),
  caption: "Key Features Overview",
)

== Implementation Details


#pagebreak()

// Project Section Template
= Project

== Project Name: Memora - For Memory Powered Learning


== Architecture Overview

#figure(
  rect(width: 5in, height: 3in, stroke: 1pt + black, fill: gray.lighten(90%))[
    #align(center + horizon)[_System Architecture Diagram_]
  ],
  caption: "Memora System Architecture",
)

== Code Snippets

=== Backend Models

==== User.js
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  // ... rest of schema
});

module.exports = mongoose.model('User', userSchema);
```

==== Topic.js
```javascript
// Topic model code placeholder
// Insert your Topic.js code here
```

=== Frontend Components

==== App.jsx
```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <Router>
          {/* Routes */}
        </Router>
      </TimerProvider>
    </AuthProvider>
  );
}
```

== Project Features

#let project_features = (
  ("User Authentication", "✓ Complete", "JWT-based authentication system"),
  ("Memory Scoring", "✓ Complete", "Adaptive memory evaluation"),
  ("Spaced Repetition", "✓ Complete", "Intelligent scheduling algorithm"),
  ("Progress Tracking", "✓ Complete", "Analytics and performance metrics"),
)

#auto-table(
  project_features,
  headers: ("Feature", "Status", "Description"),
  caption: "Project Implementation Status",
)

== Outputs

=== Screenshot Gallery

#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    #figure(
      rect(width: 3in, height: 2in, stroke: 1pt + black, fill: gray.lighten(90%))[
        #align(center + horizon)[_Landing Page Screenshot_]
      ],
      caption: "Landing Page",
    )
  ],
  [
    #figure(
      rect(width: 3in, height: 2in, stroke: 1pt + black, fill: gray.lighten(90%))[
        #align(center + horizon)[_Dashboard Screenshot_]
      ],
      caption: "User Dashboard",
    )
  ],
)

#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    #figure(
      rect(width: 3in, height: 2in, stroke: 1pt + black, fill: gray.lighten(90%))[
        #align(center + horizon)[_Topics Page Screenshot_]
      ],
      caption: "Topics Management",
    )
  ],
  [
    #figure(
      rect(width: 3in, height: 2in, stroke: 1pt + black, fill: gray.lighten(90%))[
        #align(center + horizon)[_Analytics Screenshot_]
      ],
      caption: "Analytics Dashboard",
    )
  ],
)

// More screenshot placeholders can be added here following the same pattern

#pagebreak()

// Conclusion Page (Last Page)
= Conclusion and References

The Memora project demonstrates the effective use of modern web technologies, data-driven algorithms, and memory science to build a personalized learning assistant. The project's main goal was to solve the everyday challenge of forgetting studied material, by designing a platform that adapts to individual memory patterns, topic difficulty, and deadlines.

Throughout development, a user-friendly interface was designed to let learners record topics, take the MemScore test, and generate customized revision schedules. Features like Chronicle (calendar planning) and ReviseBy (adaptive reminders) were integrated to create a structured yet flexible learning flow. The system ensures that revision intervals are spaced intelligently, helping users reinforce knowledge before it fades.

On the backend, scheduling logic based on the forgetting curve model was implemented, factoring in variables such as user scores, topic difficulty, and personal deadlines. This enabled a more scientific and practical approach to learning retention. Data storage and management ensured secure handling of user preferences, schedules, and performance history.

This integration of learning psychology with technology provided me with practical exposure to building AI-driven, user-centric applications. I not only gained experience in personalizing user flows but also faced challenges such as optimizing revision intervals, balancing busy schedules, and aligning algorithms with real human learning behaviors.

In conclusion, the Memora project deepened my understanding of combining educational science, AI, and software engineering to solve real-world problems. With future enhancements such as voice journaling, schedule extraction from free text, and AI-based performance insights, Memora has the potential to evolve into a full-fledged personal learning companion that helps students and professionals alike achieve mastery with confidence.

== References

// Automatic reference table
#let references_data = (
  ("1", "https://en.wikipedia.org/wiki/Forgetting_curve", "Forgetting Curve - Wikipedia"),
  ("2", "https://www.sciencedirect.com/topics/psychology/spaced-repetition", "Spaced Repetition Research"),
  ("3", "https://react.dev/learn", "React Documentation"),
  ("4", "https://nodejs.org/docs/latest/api/", "Node.js API Documentation"),
  ("5", "https://www.mongodb.com/docs/", "MongoDB Documentation"),
  ("6", "https://www.w3schools.com/", "W3Schools Web Development Tutorials"),
)

#auto-table(
  references_data,
  headers: ("No.", "URL", "Description"),
  caption: "References and Resources",
)

// Template functions for easy customization

#let insert-image(width: 4in, height: 3in, caption: "Image Placeholder") = {
  figure(
    rect(width: width, height: height, stroke: 1pt + black, fill: gray.lighten(90%))[
      #align(center + horizon)[\_#caption\_]
    ],
    caption: caption,
  )
}

#let insert-code-block(language: "javascript", code: "// Code placeholder") = {
  raw(code, lang: language, block: true)
}

// Usage examples in comments:
// #insert-image(width: 5in, height: 3in, caption: "Custom Image")
// #insert-code-block(language: "python", code: "print('Hello World')")
