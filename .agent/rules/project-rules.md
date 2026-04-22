---
trigger: always_on
---

## Basic Guidelines

0. This project uses utf-8 encoding
1. All dependencies in this project are installed in the virtual environment naviguard_env 
2. In this project, .gitignore includes node_modules,.env(actual project can include .agent)
3. All responses in this project use Chinese

## API Usage Guidelines

4. If the project needs to use large language models, the API storage location and usage principles are obtained from the `.agent/API.md` file
5. If you cannot find the resources you need such as API key, GitHub address, etc., traverse all .md files in the `.agent` folder

## Project Association

6. The only GitHub repository associated with this project is https://github.com/Vector897/NaviGuard

## Development Environment

7. I have installed Ollama,Docker
8. Always communicate with me in Chinese

## Project Description (fill in as needed)

# 9. Background.txt contains the project background introduction

# 10. folder Project_Info contains product information

# 11. folder Process_Documents contains project development process documents

# 12. Automatically run virtual environment when starting the project

## “Progressive Disclosure”(Progressive Disclosure)
You have access to specialized knowledge modules. Do NOT rely on internal training for these topics; strictly READ the corresponding skill file first if the task involves:
- ROS 2 Navigation: read `.agent/skills/ros_navigation.md`
- Academic Writing: read `.agent/skills/paper_writing.md`

[Strategy]
Check user request -> Identify required skill -> Read skill file -> Execute task.

## This project is an entry for the 2026 GEMINI 3 Hackathon, all requirements are based on this competition

## Reference Documents

- Project structure description:`.agent/project-structure.md`
- Tech stack description:`.agent/tech-stack.md`
- API specification:`.agent/API.md`