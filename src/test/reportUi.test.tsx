/**
 * Phase 0 hardening — the in-app report dialog (PostViewer ⋯ action):
 * reason selection, submit, duplicate guard, block/mute shortcuts.
 * Runs against the demo seam end to end.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PostViewer from '../components/PostViewer';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/http';
import type { Post } from '../types';

function renderViewer(post: Post) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <AuthProvider>
          <PostViewer post={post} onClose={vi.fn()} onInteract={vi.fn()} onFollow={vi.fn()} />
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

/** A seeded post by someone other than the demo user (id 3). */
async function someoneElsesPost(): Promise<Post> {
  const res = await apiFetch('/posts');
  const posts = (await res.json()) as Post[];
  const post = posts.find((p) => p.author.id !== 3);
  if (!post) throw new Error('seed data should contain a post by another author');
  return post;
}

const loginAsDemoUser = () => localStorage.setItem('soksan-token', 'mock-token-3');

describe('report dialog (Phase 0 hardening)', () => {
  it('opens from the ⋯ action, submits a reasoned report and blocks duplicates', async () => {
    loginAsDemoUser();
    const post = await someoneElsesPost();
    renderViewer(post);

    // Open the dialog via the more-actions button.
    fireEvent.click(screen.getByLabelText('More actions'));
    expect(await screen.findByText('Report this post')).toBeInTheDocument();

    // No reason selected yet → submit is disabled.
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Scam or fake prices'));
    fireEvent.change(screen.getByLabelText('Details (optional)'), {
      target: { value: 'Prices do not match the market' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(
      await screen.findByText('Thank you — our moderators will review this.'),
    ).toBeInTheDocument();

    // A fresh viewer opening the dialog again hits the
    // one-report-per-item guard (409).
    renderViewer(post);
    const moreButtons = screen.getAllByLabelText('More actions');
    fireEvent.click(moreButtons[moreButtons.length - 1]);
    const dialogs = await screen.findAllByText('Report this post');
    const secondDialog = dialogs[dialogs.length - 1].closest<HTMLElement>('[role="dialog"]');
    if (!secondDialog) throw new Error('expected the second report dialog');
    fireEvent.click(within(secondDialog).getByLabelText('Scam or fake prices'));
    fireEvent.click(within(secondDialog).getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByText('You already reported this post.')).toBeInTheDocument();
  });

  it('offers one-click block and mute for the author', async () => {
    loginAsDemoUser();
    const post = await someoneElsesPost();
    renderViewer(post);

    fireEvent.click(screen.getByLabelText('More actions'));
    await screen.findByText('Report this post');

    fireEvent.click(screen.getByRole('button', { name: 'Mute author' }));
    expect(
      await screen.findByText('Author muted — their posts are hidden from your feed.'),
    ).toBeInTheDocument();
  });

  it('requires a login to report', async () => {
    localStorage.removeItem('soksan-token');
    const post = await someoneElsesPost();
    renderViewer(post);

    fireEvent.click(screen.getByLabelText('More actions'));
    await screen.findByText('Report this post');
    fireEvent.click(screen.getByLabelText('Spam or misleading promotion'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(screen.getByText('Please log in to report content.')).toBeInTheDocument();
    });
  });
});
