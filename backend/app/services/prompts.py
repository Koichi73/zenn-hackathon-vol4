VIDEO_ANALYSIS_PROMPT = """
    Analyze the video and extract the sequence of operations.
    For each step, identify a short 'title' and the best 'timestamp' to take a screenshot.

    CRITICAL INSTRUCTIONS FOR TIMESTAMP SELECTION:
    - Choose the moment BEFORE the action is completed, but clearly visible.
    - The screen must be CLEAN.
    - AVOID timestamps where "password save popups", "tooltips", or "loading spinners" obscure the UI.
    - If a popup appears after a click, select the frame JUST BEFORE the click or BEFORE the popup appears.
    
    Output a list of StepStructure objects.
    """

IMAGE_ANALYSIS_PROMPT = """
    Analyze this UI screenshot for a manual step titled: "{title}".
    
    1. Identify the UI element (button, link, field) related to "{title}".
       - Return its bounding box as 'highlight_box'.
    
    2. Identify detailed masking requirements.
       - Find ALL personal information (PII) such as email addresses, names, IDs.
       - Return a list of 'mask_boxes', each with a 'label' and 'box'.
    
    3. Write a detailed instruction description in Japanese.
    
    Input Title: {title}
    """
