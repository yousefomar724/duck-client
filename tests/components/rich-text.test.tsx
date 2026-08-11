import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RichText } from '@/components/shared/rich-text';

describe('RichText', () => {
  it('renders nothing for empty text', () => {
    const { container } = render(<RichText text="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('groups consecutive bullet lines into a real list', () => {
    render(<RichText text={'تشمل الرحلة:\n* كاياك مجهز بالكامل\n* سترة نجاة'} />);

    const list = screen.getByRole('list');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('كاياك مجهز بالكامل');
    expect(items[1]).toHaveTextContent('سترة نجاة');
    expect(list).toHaveClass('list-disc');
    expect(screen.getByText('تشمل الرحلة:')).toBeInTheDocument();
  });

  it('does not render bullets as literal asterisks', () => {
    render(<RichText text="* عدم الحضور" />);
    expect(screen.queryByText('* عدم الحضور')).not.toBeInTheDocument();
    expect(screen.getByText('عدم الحضور')).toBeInTheDocument();
  });

  it('supports "-" and "•" markers too', () => {
    render(<RichText text={'- one\n• two'} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('one');
    expect(items[1]).toHaveTextContent('two');
  });

  it('separates paragraphs from a following list', () => {
    render(<RichText text={'Intro paragraph.\n\n* item one\n* item two'} />);
    expect(screen.getByText('Intro paragraph.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
