# v0へのデザイン生成プロンプト

## ダッシュボード
```
You are an expert UI/UX engineer building a SaaS application.
Create a modern web application interface based on the following requirements.

## Tech Stack
- React, Tailwind CSS, Lucide React icons
- Use `shadcn/ui` components for consistency.
- Font: "Noto Sans JP", sans-serif

## Design Theme (Tone & Manner)
- **Primary Color:** Indigo-600 (Trustworthy, Professional)
- **Background:** Clean white background with light gray (slate-50) for contrast.
- **Mood:** Clean, Functional, User-friendly for non-tech users.
- **Layout Style:** **No Sidebar.** Use a clean Top Navigation Bar for all pages.

## Task: Dashboard Layout
Create the **Dashboard Page** with a responsive **App Shell (Top Nav)**:

1.  **Top Navigation Bar (Header):**
    - Left: Brand Logo/Name ("Manual AI").
    - Right: User Profile Dropdown, "Settings" link.
    - Style: Sticky top, white background, subtle border-bottom.

2.  **Main Content Area (Container):**
    - **Page Title Section:**
        - Left: Large Title "Projects".
        - Right: A prominent "Create New Manual" button (Primary color, with Plus icon).
    - **Project Grid:**
        - Display a grid (3 columns on desktop) of Project Cards.
        - **Card Content:** Thumbnail (aspect-video, placeholder), Title, Last Updated (e.g., "2 hours ago"), and a Status Badge.

Do not generate the Editor or Login screens yet. Focus on the Dashboard layout and global styles.
```

## 編集画面
```
Great. Now, create the **Editor Page** content.
This page is for editing the manual generated from the video.

## Layout Adjustments for Editor
- **Header Update:** - Replace the "Settings/Profile" in the Top Bar with **Editor Actions**.
    - Left: "← Back to Dashboard" link.
    - Right: "Save Draft" (Ghost variant), "Share", "Download PDF" (Primary variant).

## Main Content (Split View)
Create a 2-column layout (resizable if possible, or fixed 50/50) fitting the screen height:

### Left Column: Step Editor (Tabs)
- Use a **Tabs component** with "Edit" and "Preview".
- **"Edit" Tab Content:**
    - A scrollable list of "Step Cards".
    - **Step Card Design:**
        - Row 1: Step Number (e.g., "Step 1") and Delete button.
        - Row 2: Image thumbnail (small, auto-cropped).
        - Row 3: Textarea for instruction description (editable).
        - Row 4: "Mask Image" or "Highlight Button" toggles (Icon buttons).

### Right Column: Video Player
- A large video player placeholder (aspect-video) with play/pause controls.
- Current time indicator (e.g., "00:15 / 03:00").

Please maintain the same Design Theme (Indigo, shadcn/ui) defined in the first prompt.
```

## 編集画面の修正
```
Please apply the following 4 specific improvements to the current Editor design:

1. **Global Header (Top Row):**
   - **Center:** Display the **Project Title** (e.g., "Expense Settlement Manual") in bold text.
   - **Left:** Keep the "Back to Dashboard" link.
   - **Right:** Keep the "Save", "Share" and "Download PDF" buttons.

2. **Add a Secondary Toolbar (Second Row):**
   - Create a thin, sticky toolbar immediately below the Global Header.
   - **Center of Toolbar:** Place the **"Edit / Preview" Segmented Control** here.
   - This separates the "Project Context" (Header) from the "Editing Mode" (Toolbar).

3. **Content Area Layout:**
   - **Action Buttons:** Move "Mask Image" & "Highlight" buttons to be inside the Step Card, **immediately below the image thumbnail**.
   - **Preview Behavior:** When "Preview" tab is active in the Toolbar, hide the Video Player and switch the Step list to a **Single Column** layout to simulate the end-user view.
   - **Edit Behavior:** Keep the 2-column split view (Video + Editor).

4. **Clean Up:** Remove any other sub-headers like "Step Editor" and "Original Video" to save space, since we now have the Toolbar.
```

## 編集画面の修正(ヘッダー周り)
```
Let's standardize the header layout and organize the Editor workspace.
Please update the **Editor Page** structure to use a "Global Header + Project Toolbar" layout.

1. **Row 1: Global Navigation (Same as Dashboard)**
   - **Left:** Brand Logo ("Manual AI"). Clicking this should act as "Back to Dashboard".
   - **Right:** User Profile Avatar (Circle).
   - **Remove:** Remove the "Settings" button.
   - **Remove:** Remove the old "Back to Dashboard" text link and previous buttons from this row.

2. **Row 2: Project Toolbar (Sticky below Global Nav)**
   - Move all project-specific controls here.
   - **Left:** The "Edit / Preview" Segmented Control (Toggle).
   - **Center:** The **Project Title** (Bold).
   - **Right:** Action Group: "Save", "Share", "Download PDF".

This creates a clear separation: Top row is for the App, Second row is for the Project context.
Keep the rest of the 2-column layout (Video & Step List) exactly as it is.
```


## 閲覧画面
```
Now, create the **Viewer Page** (Read-only view for end-users) based on the preview layout.

Please apply the following changes to make it a public-facing page:

1. **Header Adjustments:**
   - **Left:** Remove "Back to Dashboard".
   - **Center:** Keep the Project Title.
   - **Right:** Remove "Save" and "Share". **Keep only "Download PDF"**.
   - **Remove Secondary Toolbar:** Completely remove the "Edit / Preview" toolbar row. The viewer does not need modes.

2. **Step Content (Read-only):**
   - Ensure the layout is a clean **Single Column** (max-w-4xl, centered).
   - Display the Step Number, Image, and Description.
   - **Strictly No Edit Controls:** Ensure no "Delete" icons, no "Mask/Highlight" buttons, and no textareas (use simple text display).

3. **Add Feedback Feature:**
   - Add a "Feedback Section" immediately below the text description of **each step**.
   - Design: A subtle row with two icon buttons:
     - [Thumbs Up Icon] (Outline style)
     - [Thumbs Down Icon] (Outline style)
   - Style it with a light gray text/border so it doesn't distract from the main content.

Keep the same "Indigo" branding and clean white background.
```

## 動画アップロード
```
Now, create the **"Empty State" version** of this Editor page (Video Upload Screen).

Use the "Global Header" layout you just created, but change the main content.

1.  **Header & Toolbar State:**
    * **Row 1 (Global):** Same as before.

2.  **Main Content (Upload Area):**
    * Remove the 2-column split view.
    * Create a large, centered **Drag & Drop Zone** (takes up most of the screen, with a dashed border).
    * **Visuals inside the zone:**
        * A large, friendly "Cloud Upload" or "Video" icon.
        * Main Text: "Drop your screen recording here".
        * Sub Text: "or click to browse (MP4, MOV)".

Keep the design clean, spacious, and consistent with the established Indigo theme.
```

## ログイン画面
```
Now, create the **Login Page**.

## Layout
- **Style:** A centered "Card" layout on a light gray (slate-50) background.
- **Card Design:** Clean white background, subtle shadow (`shadow-lg`), rounded corners (`rounded-xl`), max-width `md`.

## Content inside the Card
1.  **Header:**
    - **Logo:** Display the "Manual AI" Brand Logo (Large & Centered) at the top.
    - **Title:** "Welcome back"

2.  **Auth Options:**
    - **Email Form:**
        - Email Input (Label: "Email", Placeholder: "name@company.com")
        - Password Input (Label: "Password")
        - **Submit Button:** "Sign In" (Primary Indigo color, full width).
    - **Other authentication:**
        - This time, we will not implement authentication other than email addresses
        - Please do not add other elements such as "Sign in with Google".

3.  **Footer:**
    - A simple link below the button: "Don't have an account? Sign up" (Indigo text).

Keep it professional, clean, and consistent with the Indigo branding used in previous pages.
```


## 編集画面の修正(1カラムに)
```
Refine the **Editor Page** layout based on specific user requirements.
The goal is to provide a wider editing area while keeping the video accessible.

## Layout Structure: "Sidebar + Main Content + Floating Video"

### 1. Left Sidebar (Navigation)
- **Position:** Fixed to the left (width: approx 250px). If the width is insufficient, please prioritize the central editing area and hide the table of contents.
- **Content:** A "Table of Contents" / Timeline list of steps (e.g., "Step 1", "Step 2").
- **Function:** Clicking an item scrolls the Main Content to that specific step.
- **Style:** Clean, bordered-right, background-muted/10.

### 2. Main Content Area (Center Editor)
- **Position:** Fills the remaining width (to the right of the sidebar).
- **Layout:** **Single Column.**
- **Content:** The list of "Step Cards" (from the previous design).
- **Improvement:**
    - Do not change the internal design of the Step Cards (keep the textareas and buttons as they are).
    - **Crucial:** Allow the Step Cards to expand in width (e.g., `max-w-4xl`) so the screenshots inside them appear much larger and easier to edit.

### 3. Floating Video Player
- **Position:** **Fixed at the bottom-right corner** of the screen (Floating Widget style).
- **Style:** A compact video player window (approx 320px wide) with a shadow and rounded corners.
- **Behavior:** It should hover above the content, ensuring it's always visible but doesn't take up layout space.
- **Controls:** Include a "Minimize/Expand" button in the player header to collapse it if it's blocking the view.
```