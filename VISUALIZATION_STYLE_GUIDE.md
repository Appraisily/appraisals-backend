# Appraisal Visualization Style Guide

## Design Philosophy

The visualization style for our appraisal reports follows a clean, modern aesthetic with an emphasis on clarity and professionalism. The design language utilizes a combination of:

- **Professional color palette**: Blues, teals, and purples for primary elements with intentional accent colors
- **Subtle shadows and depth**: Creating visual hierarchy without overwhelming the content
- **Rounded corners**: Providing a contemporary, approachable feel
- **Minimalist interfaces**: Focusing on data rather than decorative elements
- **Responsive components**: Adapting gracefully to different screen sizes

## Color Palette

### Primary Colors
- **Primary Blue**: `#3182CE` (rgb(49, 130, 206))
- **Deep Blue**: `#2563EB` (rgb(37, 99, 235))
- **Navy**: `#1E40AF` (rgb(30, 64, 175))

### Accent Colors
- **Purple**: `#8B5CF6` (rgb(139, 92, 246))
- **Teal**: `#0D9488` (rgb(13, 148, 136))
- **Success Green**: `#10B981` (rgb(16, 185, 129))
- **Warning Amber**: `#F59E0B` (rgb(245, 158, 11))
- **Error Red**: `#E53E3E` (rgb(229, 62, 62))

### Neutrals
- **White**: `#FFFFFF` (rgb(255, 255, 255))
- **Light Gray**: `#F3F4F6` (rgb(243, 244, 246))
- **Medium Gray**: `#E5E7EB` (rgb(229, 231, 235))
- **Gray**: `#9CA3AF` (rgb(156, 163, 175))
- **Dark Gray**: `#4B5563` (rgb(75, 85, 99))
- **Charcoal**: `#1F2937` (rgb(31, 41, 55))
- **Black**: `#111827` (rgb(17, 24, 39))

## Typography

### Font Family
```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", 
             Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
```

### Font Sizes
- **xs**: `0.75rem` (12px)
- **sm**: `0.875rem` (14px)
- **base**: `1rem` (16px)
- **lg**: `1.125rem` (18px)
- **xl**: `1.25rem` (20px)
- **2xl**: `1.5rem` (24px)
- **3xl**: `1.875rem` (30px)
- **4xl**: `2.25rem` (36px)

### Font Weights
- **Regular**: `400`
- **Medium**: `500`
- **Semibold**: `600`
- **Bold**: `700`

### Line Heights
- **Tight**: `1.25`
- **Snug**: `1.375`
- **Normal**: `1.5`
- **Relaxed**: `1.625`
- **Loose**: `2`

## Component Styles

### Cards and Containers
```css
background: white;
border-radius: 12px;
box-shadow: 0 1px 3px rgba(0,0,0,0.05);
border: 1px solid #E2E8F0;
transition: all 0.2s ease;
```

### Charts
All charts use Chart.js with consistent styling:
- Rounded corners on bars
- Smooth animations (1.5s duration)
- Semi-transparent backgrounds (0.2 alpha)
- Consistent border widths (2px)
- Tooltips with white text on dark background

### Value Component Breakdown Donut Chart
- Consistent color palette with distinct hues
- Inner padding (60% cutout)
- Custom legends with matching colors and value percentages
- Animation that draws the chart segments sequentially

### Radar Chart (Item Metrics)
- Defined min/max ranges (0-100)
- Step size of 20 for readability
- Semi-transparent fill with solid borders
- Point highlights on hover

### Time-Value Map
- Clear separation of historical data, current value, and projections
- Scatter plot with connecting lines for the trend
- Custom point styling (circles for comparables, rectangles for user's item)
- Annotation zones for market context (undervalued/overvalued areas)

### Market Position Gauge
- Semi-circular gauge with color gradient (green to red)
- Dynamic needle position
- Clearly labeled scale
- Animated on initial view

## Interactive Elements

### Buttons
```css
background: rgba(226, 232, 240, 0.5);
border: none;
border-radius: 6px;
padding: 0.4rem 0.8rem;
font-size: 0.8rem;
font-weight: 500;
color: #4A5568;
cursor: pointer;
transition: all 0.2s;
```

### Filter Buttons
- Clear active state styling
- Hover effects with subtle background changes
- Consistent spacing between buttons
- Dropdown menus for advanced filters

### Table Controls
- Sortable headers with directional indicators
- Alternating row colors for readability
- Highlighted current item
- Positive/negative values with color indicators

## Animation Guidelines

- **Loading**: Use staggered animations for metrics (0.1s delay between elements)
- **Transitions**: Keep transitions swift (0.2-0.3s) for UI elements
- **Charts**: Use longer animations (1-1.5s) with easing for data visualization
- **Hover**: Subtle scale increase (1.03-1.05x) for interactive elements

## Responsive Behavior

### Breakpoints
- **Large**: 992px+
- **Medium**: 768px-991px
- **Small**: 576px-767px
- **Extra Small**: <576px

### Adaptations
- Grid layouts change from 3-4 columns to 2 columns to 1 column
- Font sizes reduce by approximately 10-15% on mobile
- Chart heights adjust to maintain visibility
- Controls stack vertically on smaller screens

## Data Visualization Best Practices

1. **Consistency**: Maintain consistent scales and measurement units
2. **Color meaning**: Use color consistently (red for negative, green for positive)
3. **Context**: Always provide market context for the user's item
4. **Legends**: Clear, concise legends that explain data representation
5. **Labeling**: Direct labeling where possible instead of requiring legend reference
6. **Interactivity**: Provide tooltips with additional information on hover
7. **Animation**: Use animation to draw attention to important data points

## Implementation Notes

The visualizations are implemented using Chart.js with custom configurations. The design system is built on modern CSS features including:

- CSS Custom Properties (variables)
- Flexbox and CSS Grid for layouts
- Calc() for dynamic sizing
- Responsive units (rem, %)
- Transitions and animations

This style guide ensures a cohesive, professional visual language across all appraisal visualizations while maintaining clarity and accessibility for users.