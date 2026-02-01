# Template: HTML Presentation

## Purpose
Create standalone HTML presentations for learning complex topics.

## Output Format

Kimi generates: `docs/learning/[topic-slug].html`

## Template Structure

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TOPIC}} - Interactive Guide</title>
    <style>
        /* Modern, clean design */
        :root {
            --primary: #2563eb;
            --secondary: #64748b;
            --bg: #f8fafc;
            --card: #ffffff;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            line-height: 1.6;
            color: #1e293b;
        }
        
        /* Slide container */
        .slide {
            min-height: 100vh;
            padding: 4rem 2rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            max-width: 900px;
            margin: 0 auto;
        }
        
        .slide:nth-child(even) {
            background: white;
        }
        
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: var(--primary);
        }
        
        h2 {
            font-size: 2rem;
            margin: 2rem 0 1rem;
            color: var(--primary);
        }
        
        /* Code blocks */
        pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
        }
        
        code {
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9rem;
        }
        
        /* Diagrams */
        .diagram {
            background: var(--card);
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 2rem;
            margin: 2rem 0;
            text-align: center;
            font-family: monospace;
            white-space: pre;
            overflow-x: auto;
        }
        
        /* Cards */
        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        
        .card {
            background: var(--card);
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .card h3 {
            color: var(--primary);
            margin-bottom: 0.5rem;
        }
        
        /* Navigation */
        .nav {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            display: flex;
            gap: 0.5rem;
        }
        
        .nav button {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
        }
        
        .nav button:hover {
            opacity: 0.9;
        }
        
        /* Progress bar */
        .progress {
            position: fixed;
            top: 0;
            left: 0;
            height: 4px;
            background: var(--primary);
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="progress" id="progress"></div>
    
    <!-- Slide 1: Title -->
    <section class="slide" id="slide-1">
        <h1>📚 {{TOPIC}}</h1>
        <p style="font-size: 1.25rem; color: var(--secondary);">
            A visual guide to understanding {{description}}
        </p>
        <p style="margin-top: 2rem; color: var(--secondary);">
            Use arrow keys or buttons to navigate
        </p>
    </section>
    
    <!-- Slide 2: Overview -->
    <section class="slide" id="slide-2">
        <h2>Overview</h2>
        <p>{{High-level explanation}}</p>
        <div class="card-grid">
            <div class="card">
                <h3>🎯 Purpose</h3>
                <p>{{Why this exists}}</p>
            </div>
            <div class="card">
                <h3>⚡ Key Benefits</h3>
                <p>{{Main advantages}}</p>
            </div>
            <div class="card">
                <h3>🔧 Components</h3>
                <p>{{Main parts}}</p>
            </div>
        </div>
    </section>
    
    <!-- Slide 3: Architecture -->
    <section class="slide" id="slide-3">
        <h2>Architecture</h2>
        <div class="diagram">
{{ASCII DIAGRAM HERE}}
        </div>
        <p>{{Explanation of components}}</p>
    </section>
    
    <!-- Slide 4: Code Example -->
    <section class="slide" id="slide-4">
        <h2>Implementation</h2>
        <pre><code>{{Code example with comments}}</code></pre>
        <p>{{Walkthrough of key parts}}</p>
    </section>
    
    <!-- Slide 5: Key Concepts -->
    <section class="slide" id="slide-5">
        <h2>Key Concepts</h2>
        <div class="card-grid">
            {{Concept cards}}
        </div>
    </section>
    
    <!-- Slide 6: Summary -->
    <section class="slide" id="slide-6">
        <h2>🎓 Summary</h2>
        <ul style="font-size: 1.25rem; line-height: 2;">
            <li>{{Key takeaway 1}}</li>
            <li>{{Key takeaway 2}}</li>
            <li>{{Key takeaway 3}}</li>
        </ul>
        <p style="margin-top: 2rem; color: var(--secondary);">
            Generated by Kimi Code CLI • {{Date}}
        </p>
    </section>
    
    <!-- Navigation -->
    <div class="nav">
        <button onclick="prevSlide()">← Previous</button>
        <button onclick="nextSlide()">Next →</button>
    </div>
    
    <script>
        let currentSlide = 1;
        const totalSlides = 6;
        
        function showSlide(n) {
            if (n < 1) n = 1;
            if (n > totalSlides) n = totalSlides;
            currentSlide = n;
            
            // Hide all slides
            document.querySelectorAll('.slide').forEach(s => {
                s.style.display = 'none';
            });
            
            // Show current
            document.getElementById(`slide-${n}`).style.display = 'flex';
            
            // Update progress
            document.getElementById('progress').style.width = 
                `${(n / totalSlides) * 100}%`;
            
            // Scroll to top
            window.scrollTo(0, 0);
        }
        
        function nextSlide() {
            showSlide(currentSlide + 1);
        }
        
        function prevSlide() {
            showSlide(currentSlide - 1);
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
        });
        
        // Initialize
        showSlide(1);
    </script>
</body>
</html>
```

## Usage

Tell Kimi:
```
"Create HTML presentation explaining [topic]"
"Generate interactive slides for [concept]"
"Make a visual guide for [architecture]"
```

## Output Location
All presentations saved to: `docs/learning/`
