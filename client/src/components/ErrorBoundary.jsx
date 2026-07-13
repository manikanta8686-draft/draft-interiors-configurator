import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  retry = () => this.setState({ hasError: false });

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error, info) {
    console.error("Draft Interiors interface error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return typeof this.props.fallback === "function"
        ? this.props.fallback(this.retry)
        : this.props.fallback;
    }
    return this.props.children;
  }
}
