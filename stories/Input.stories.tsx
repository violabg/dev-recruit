import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { Eye, EyeOff, Lock, Mail, Search as SearchIcon } from "lucide-react";
import { useState } from "react";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["text", "email", "password", "number", "tel", "url", "search"],
    },
    disabled: {
      control: { type: "boolean" },
    },
    placeholder: {
      control: { type: "text" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Enter your email" />
    </div>
  ),
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter password",
  },
};

export const SearchInput: Story = {
  render: () => (
    <div className="relative">
      <SearchIcon className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
      <Input type="search" placeholder="Search..." className="pl-10" />
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
          <Input
            type="email"
            placeholder="Enter your email"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
          <Input
            type="password"
            placeholder="Enter your password"
            className="pl-10"
          />
        </div>
      </div>
    </div>
  ),
};

export const PasswordWithToggle: Story = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="pr-10 pl-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="top-1/2 right-3 absolute w-4 h-4 text-muted-foreground hover:text-foreground -translate-y-1/2"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Default</Label>
        <Input placeholder="Normal state" />
      </div>

      <div className="space-y-2">
        <Label>Focused</Label>
        <Input placeholder="Focus state" autoFocus />
      </div>

      <div className="space-y-2">
        <Label>Disabled</Label>
        <Input placeholder="Disabled state" disabled />
      </div>

      <div className="space-y-2">
        <Label>Error</Label>
        <Input placeholder="Error state" aria-invalid />
      </div>

      <div className="space-y-2">
        <Label>With Value</Label>
        <Input defaultValue="Some content" />
      </div>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Text Input</Label>
        <Input type="text" placeholder="Enter text" />
      </div>

      <div className="space-y-2">
        <Label>Email Input</Label>
        <Input type="email" placeholder="Enter email" />
      </div>

      <div className="space-y-2">
        <Label>Number Input</Label>
        <Input type="number" placeholder="Enter number" />
      </div>

      <div className="space-y-2">
        <Label>Tel Input</Label>
        <Input type="tel" placeholder="Enter phone number" />
      </div>

      <div className="space-y-2">
        <Label>URL Input</Label>
        <Input type="url" placeholder="Enter URL" />
      </div>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <form className="space-y-6 w-96">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input id="name" type="text" placeholder="John Doe" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <div className="relative">
          <Mail className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input id="company" type="text" placeholder="Acme Inc." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="search">Search Skills</Label>
        <div className="relative">
          <SearchIcon className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
          <Input
            id="search"
            type="search"
            placeholder="React, TypeScript, Node.js..."
            className="pl-10"
          />
        </div>
      </div>
    </form>
  ),
};
