import { Button } from "@/components/ui/button";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { Download, Plus, Trash2 } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: [
        "default",
        "destructive",
        "outline",
        "outlineDestructive",
        "secondary",
        "ghost",
        "link",
        "glass",
      ],
    },
    size: {
      control: { type: "select" },
      options: ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"],
    },
    asChild: {
      control: { type: "boolean" },
    },
    disabled: {
      control: { type: "boolean" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const OutlineDestructive: Story = {
  args: {
    variant: "outlineDestructive",
    children: "Cancel",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "Link",
  },
};

export const Glass: Story = {
  args: {
    variant: "glass",
    children: "Glass",
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Download className="mr-2 w-4 h-4" />
        Download
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    variant: "outline",
    size: "icon",
    children: <Plus className="w-4 h-4" />,
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <div className="mr-2 border-2 border-t-transparent border-background rounded-full w-4 h-4 animate-spin" />
        Loading...
      </>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="gap-4 grid">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Button Variants</h3>
        <div className="flex flex-wrap gap-4">
          <Button>Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="outlineDestructive">Outline Destructive</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="glass">Glass</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Button Sizes</h3>
        <div className="flex items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Icon Buttons</h3>
        <div className="flex items-center gap-4">
          <Button size="icon-sm" variant="outline">
            <Plus className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
          <Button size="icon-lg" variant="outline">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">With Icons</h3>
        <div className="flex flex-wrap gap-4">
          <Button>
            <Download className="mr-2 w-4 h-4" />
            Download
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 w-4 h-4" />
            Delete
          </Button>
          <Button variant="outline">
            <Plus className="mr-2 w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>
    </div>
  ),
};
