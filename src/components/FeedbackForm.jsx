import React, { useState } from 'react';

function FeedbackForm() {
  const [formData, setFormData] = useState({ rating: '', comment: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const validate = () => {
    const newErrors = {};
    if (!formData.rating) newErrors.rating = 'Please select a rating';
    if (!formData.comment.trim()) {
      newErrors.comment = 'Please provide a comment';
    } else if (formData.comment.trim().length < 5) {
      newErrors.comment = 'Comment must be at least 5 characters';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setLoading(false);
      setSuccess({
        message: `Thank you for your feedback! You rated us ${formData.rating}/5.`,
      });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: undefined });
    }
  };

  if (success) {
    return (
      <div className="form-container">
        <div className="success-message" data-testid="feedback-success">
          {success.message}
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>Feedback</h2>
      <form onSubmit={handleSubmit} data-testid="feedback-form">
        <div className="form-group">
          <label htmlFor="rating">Rating</label>
          <select
            id="rating"
            name="rating"
            value={formData.rating}
            onChange={handleChange}
          >
            <option value="">-- Select rating --</option>
            <option value="1">1 - Poor</option>
            <option value="2">2 - Fair</option>
            <option value="3">3 - Good</option>
            <option value="4">4 - Very Good</option>
            <option value="5">5 - Excellent</option>
          </select>
          {errors.rating && <p className="error-text" data-testid="rating-error">{errors.rating}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="comment">Comment</label>
          <textarea
            id="comment"
            name="comment"
            placeholder="Tell us what you think..."
            value={formData.comment}
            onChange={handleChange}
          />
          {errors.comment && <p className="error-text" data-testid="comment-error">{errors.comment}</p>}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
      {loading && <p className="loading">Submitting feedback...</p>}
    </div>
  );
}

export default FeedbackForm;
