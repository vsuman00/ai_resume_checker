# Resume ATS Checker

[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![React Router](https://img.shields.io/badge/React%20Router-7.7.1-red.svg)](https://reactrouter.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1.4-38B2AC.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## Description

Resume ATS Checker is an intelligent web application that analyzes resumes for Applicant Tracking System (ATS) compatibility and provides comprehensive feedback to help job seekers optimize their resumes. The application uses AI-powered analysis to evaluate resumes across multiple dimensions including ATS compatibility, content quality, structure, tone, and skills alignment with specific job requirements.

## Features

- 🔍 **ATS Score Analysis** - Comprehensive scoring system that evaluates how well your resume performs in Applicant Tracking Systems
- 📊 **Multi-Dimensional Feedback** - Detailed analysis across five key areas:
  - ATS Compatibility
  - Content Quality
  - Resume Structure
  - Tone and Style
  - Skills Assessment
- 📄 **PDF Processing** - Upload and analyze PDF resumes with automatic conversion to images for visual feedback
- 🎯 **Job-Specific Analysis** - Tailored feedback based on specific job titles and descriptions
- 💾 **Resume Management** - Track and manage multiple resume versions and their analysis results
- 🔐 **Secure Authentication** - User authentication system for personalized resume tracking
- 📱 **Responsive Design** - Modern, mobile-friendly interface built with TailwindCSS
- ⚡ **Real-time Processing** - Fast analysis with visual progress indicators
- 🎨 **Interactive UI Components** - Score gauges, progress indicators, and detailed feedback cards

## Installation

### Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- Docker (optional, for containerized deployment)

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Resume_ATS
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Copy PDF worker file**

   ```bash
   npm run copy-worker
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` to access the application.

### Docker Deployment

1. **Build the Docker image**

   ```bash
   docker build -t resume-ats .
   ```

2. **Run the container**
   ```bash
   docker run -p 3000:3000 resume-ats
   ```

## Usage

### Basic Operation

1. **Authentication**
   - Navigate to the application and sign in with your credentials
   - New users can create an account through the authentication page

2. **Upload Resume**
   - Click on "Upload Resume" or navigate to `/upload`
   - Drag and drop your PDF resume or click to select a file
   - Enter the job title and company name for targeted analysis
   - Optionally provide a job description for more specific feedback

3. **Analysis Process**
   - The system will process your resume through multiple stages:
     - File upload and validation
     - PDF to image conversion
     - AI-powered content analysis
     - Score calculation and feedback generation

4. **Review Results**
   - View your overall ATS score (0-100)
   - Explore detailed feedback in five categories
   - Review specific tips and recommendations
   - Save results for future reference

### Example Workflow

```bash
# Start the application
npm run dev

# Navigate to http://localhost:5173
# 1. Sign in or create account
# 2. Upload your resume PDF
# 3. Enter job details (title, company, description)
# 4. Wait for analysis completion
# 5. Review comprehensive feedback and scores
```

## Configuration

```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production-ready application
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run copy-worker` - Copy PDF.js worker file to public directory

### Customization

The application can be customized through:

- **Styling**: Modify TailwindCSS configuration in `tailwind.config.js`
- **Scoring Logic**: Update scoring algorithms in the constants file
- **UI Components**: Customize React components in the `app/components` directory
- **Routes**: Add or modify routes in the `app/routes` directory

## Contributing

We welcome contributions to improve the Resume ATS Checker! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices and maintain type safety
- Use consistent code formatting (Prettier recommended)
- Write meaningful commit messages
- Add tests for new features when applicable
- Update documentation for significant changes
- Ensure all existing tests pass before submitting

### Code Style

- Use functional components with React hooks
- Follow React Router v7 patterns for routing
- Maintain consistent file and folder naming conventions
- Use TailwindCSS for styling with semantic class names
- Implement proper error handling and loading states

### Reporting Issues

- Use the GitHub issue tracker to report bugs
- Provide detailed reproduction steps
- Include relevant system information and error messages
- Search existing issues before creating new ones

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

## Acknowledgements

### Technologies and Libraries

- **[React](https://reactjs.org/)** - A JavaScript library for building user interfaces
- **[React Router](https://reactrouter.com/)** - Declarative routing for React applications
- **[TypeScript](https://www.typescriptlang.org/)** - Typed superset of JavaScript
- **[TailwindCSS](https://tailwindcss.com/)** - A utility-first CSS framework
- **[PDF.js](https://mozilla.github.io/pdf.js/)** - PDF rendering library for JavaScript
- **[React Dropzone](https://react-dropzone.js.org/)** - File upload component for React
- **[Zustand](https://github.com/pmndrs/zustand)** - Small, fast, and scalable state management
- **[Vite](https://vitejs.dev/)** - Next generation frontend tooling

### Special Thanks

- The open-source community for providing excellent tools and libraries
- Contributors who help improve the application
- Users who provide valuable feedback and suggestions
- The React and TypeScript communities for comprehensive documentation

### Resources

- [ATS Best Practices Guide](https://www.indeed.com/career-advice/resumes-cover-letters/ats-resume)
- [Resume Writing Guidelines](https://www.harvard.edu/careers/resume-writing-guide)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/getting_started/)

---

**Made with ❤️ for job seekers everywhere**

For questions, suggestions, or support, please open an issue on GitHub or contact the maintainers.
```
