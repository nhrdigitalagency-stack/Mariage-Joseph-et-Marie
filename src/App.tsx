/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nContext.tsx';
import { PublicHomePage } from './pages/PublicHomePage.tsx';
import { PrivateInvitationPage } from './pages/PrivateInvitationPage.tsx';
import { AdminPortalPage } from './pages/AdminPortalPage.tsx';
import { PrivacyPage, NotFoundPage } from './pages/PrivacyAndNotFoundPages.tsx';

const ScrollAndHashManager: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [pathname, hash]);

  return null;
};

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <ScrollAndHashManager />
        <Routes>
          {/* Public general wedding page & direct section route aliases */}
          <Route path="/" element={<PublicHomePage />} />
          <Route path="/accueil" element={<PublicHomePage initialSection="accueil" />} />
          <Route path="/union" element={<PublicHomePage initialSection="union" />} />
          <Route path="/nos-moments" element={<PublicHomePage initialSection="nos-moments" />} />
          <Route
            path="/infos-pratiques"
            element={<PublicHomePage initialSection="infos-pratiques" />}
          />
          <Route path="/acces-prive" element={<PublicHomePage initialSection="acces-prive" />} />

          {/* Private token-based guest invitation routes */}
          <Route path="/invitation/:token" element={<PrivateInvitationPage />} />
          <Route
            path="/invitation/:token/reponse"
            element={<PrivateInvitationPage focusRsvpOnMount={true} />}
          />
          <Route
            path="/invitation/:token/programme"
            element={<PrivateInvitationPage initialSection="programme" />}
          />
          <Route
            path="/invitation/:token/tenue"
            element={<PrivateInvitationPage initialSection="tenue" />}
          />
          <Route
            path="/invitation/:token/souvenirs"
            element={<PrivateInvitationPage initialSection="souvenirs" />}
          />

          {/* Secure Administration routes */}
          <Route path="/admin" element={<AdminPortalPage section="dashboard" />} />
          <Route path="/admin/invitations" element={<AdminPortalPage section="invitations" />} />
          <Route
            path="/admin/invitations/nouvelle"
            element={<AdminPortalPage section="new_invitation" />}
          />
          <Route
            path="/admin/invitations/:id"
            element={<AdminPortalPage section="edit_invitation" />}
          />
          <Route path="/admin/evenements" element={<AdminPortalPage section="events" />} />
          <Route path="/admin/reponses" element={<AdminPortalPage section="responses" />} />
          <Route path="/admin/souvenirs" element={<AdminPortalPage section="memories" />} />

          {/* Privacy notice */}
          <Route path="/confidentialite" element={<PrivacyPage />} />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
