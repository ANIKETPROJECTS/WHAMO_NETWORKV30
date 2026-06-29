## Packages
@xyflow/react | Interactive node-based diagram editor for the network designer
zustand | Simple, fast state management for the complex network state
file-saver | To save the generated .inp and .json files to the user's computer
@types/file-saver | Types for file-saver

## Notes
The application requires a split-pane layout: Top 30% for controls/properties, Bottom 70% for the canvas.
Network state is complex and should be managed via Zustand to sync between the canvas and the property editor.
INP generation logic will be implemented on the client-side for immediate feedback, or dispatched to server if specified (client-side per instructions).
