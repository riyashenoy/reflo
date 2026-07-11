import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';

import { auth } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import {
  DEFAULT_PREFERENCES,
  fetchUserProfile,
  formatHeight,
  formatMindfulAreas,
  formatProfileSubtitle,
  formatWeight,
  getAgeFromBirthday,
  saveUserProfile,
  type UserPreferences,
  type UserProfile,
} from '../lib/userProfile';
import { EditPencilIcon } from '../components/EditPencilIcon';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { ProfileAboutEditSheet } from '../components/profile/ProfileAboutEditSheet';
import {
  ProfileBodyEditSheet,
  type BodyEditField,
} from '../components/profile/ProfileBodyEditSheet';
import { ProfileMindfulEditSheet } from '../components/profile/ProfileMindfulEditSheet';
import {
  FadeInView,
  PressableScale,
  ProfileHeaderSkeleton,
  SkeletonBlock,
} from '../components/motion';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import theme, { scale } from '../theme';

const WARM_RULE = '#E4E2DD';

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function BodyRow({
  label,
  value,
  onPress,
  showDivider,
}: {
  label: string;
  value: string;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      {showDivider ? <View style={styles.rowDivider} /> : null}
      <PressableScale style={styles.listRow} onPress={onPress}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
        <Text style={styles.chevron}>›</Text>
      </PressableScale>
    </>
  );
}

function PreferenceRow({
  title,
  subtitle,
  value,
  onValueChange,
  showDivider,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  showDivider?: boolean;
}) {
  return (
    <>
      {showDivider ? <View style={styles.rowDivider} /> : null}
      <View style={styles.listRow}>
        <View style={styles.preferenceText}>
          <Text style={styles.rowLabel}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        <ThemeToggle value={value} onValueChange={onValueChange} />
      </View>
    </>
  );
}

export default function Profile() {
  const tabTopPadding = useTabScreenTopPadding();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [motionCapture, setMotionCapture] = useState(true);
  const [instructorVoice, setInstructorVoice] = useState(true);
  const [workoutMusic, setWorkoutMusic] = useState(true);
  const [reminders, setReminders] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [bodyEditField, setBodyEditField] = useState<BodyEditField | null>(null);
  const [aboutSheetVisible, setAboutSheetVisible] = useState(false);
  const [mindfulSheetVisible, setMindfulSheetVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchUserProfile(uid);
      setProfile(data);
      const prefs = data?.preferences ?? DEFAULT_PREFERENCES;
      setMotionCapture(prefs.motionCapture);
      setInstructorVoice(prefs.instructorVoice);
      setWorkoutMusic(prefs.workoutMusic);
      setReminders(prefs.reminders);
    } catch (err) {
      Alert.alert('Profile error', getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const displayName =
    profile?.name?.trim() ||
    auth.currentUser?.displayName ||
    'Your profile';
  const displayEmail = auth.currentUser?.email ?? '—';
  const profileSubtitle = formatProfileSubtitle(profile);
  const mindfulSubtitle = formatMindfulAreas(profile?.mindfulAreas);

  const updatePreferences = async (next: UserPreferences) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    try {
      await saveUserProfile(uid, { preferences: next });
      setProfile((prev) => (prev ? { ...prev, preferences: next } : prev));
    } catch (err) {
      Alert.alert('Save failed', getAuthErrorMessage(err));
      loadProfile();
    }
  };

  const handleEmailPress = () => {
    Alert.alert(
      'Email',
      `Your sign-in email is ${displayEmail}. Email changes are managed through your authentication provider.`
    );
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch (err) {
      Alert.alert('Sign out failed', getAuthErrorMessage(err));
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: tabTopPadding, paddingHorizontal: scale(20) },
        ]}
      >
        <ProfileHeaderSkeleton />
        <SkeletonBlock height={scale(88)} style={{ marginBottom: scale(16) }} />
        <SkeletonBlock height={scale(140)} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: tabTopPadding },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.heading}>Your profile.</Text>
        </View>
        <PressableScale
          style={styles.editButton}
          hitSlop={8}
          onPress={() => setAboutSheetVisible(true)}
        >
          <EditPencilIcon />
        </PressableScale>
      </View>

      <FadeInView delay={60} style={styles.hero}>
        <ProfileAvatar
          name={profile?.name}
          email={auth.currentUser?.email}
        />
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.subtitle}>{profileSubtitle}</Text>
      </FadeInView>

      <FadeInView delay={100}>
        <PressableScale
          style={styles.mindfulCard}
          onPress={() => setMindfulSheetVisible(true)}
        >
          <View style={styles.mindfulText}>
            <Text style={styles.mindfulLabel}>MINDFUL AREAS</Text>
            <Text style={styles.mindfulSubtitle}>{mindfulSubtitle}</Text>
          </View>
          <Text style={styles.mindfulChevron}>›</Text>
        </PressableScale>
      </FadeInView>

      <FadeInView delay={140}>
        <SectionLabel title="BODY" />
        <View style={styles.listBlock}>
          <BodyRow
            label="Height"
            value={formatHeight(profile)}
            onPress={() => setBodyEditField('height')}
          />
          <BodyRow
            label="Weight"
            value={formatWeight(profile)}
            onPress={() => setBodyEditField('weight')}
            showDivider
          />
          <BodyRow
            label="Age"
            value={getAgeFromBirthday(profile?.birthday)}
            onPress={() => setBodyEditField('age')}
            showDivider
          />
        </View>
      </FadeInView>

      <FadeInView delay={180}>
        <SectionLabel title="PREFERENCES" />
        <View style={styles.listBlock}>
          <PreferenceRow
            title="Motion Capture"
            subtitle="Real-time form corrections"
            value={motionCapture}
            onValueChange={(value) => {
              setMotionCapture(value);
              updatePreferences({
                motionCapture: value,
                instructorVoice,
                workoutMusic,
                reminders,
              });
            }}
          />
          <PreferenceRow
            title="Instructor Voice"
            subtitle="AI Audio cues"
            value={instructorVoice}
            onValueChange={(value) => {
              setInstructorVoice(value);
              updatePreferences({
                motionCapture,
                instructorVoice: value,
                workoutMusic,
                reminders,
              });
            }}
            showDivider
          />
          <PreferenceRow
            title="Workout music"
            subtitle="Plays during class"
            value={workoutMusic}
            onValueChange={(value) => {
              setWorkoutMusic(value);
              updatePreferences({
                motionCapture,
                instructorVoice,
                workoutMusic: value,
                reminders,
              });
            }}
            showDivider
          />
          <PreferenceRow
            title="Reminders"
            subtitle="Daily workout nudges"
            value={reminders}
            onValueChange={(value) => {
              setReminders(value);
              updatePreferences({
                motionCapture,
                instructorVoice,
                workoutMusic,
                reminders: value,
              });
            }}
            showDivider
          />
        </View>
      </FadeInView>

      <FadeInView delay={220}>
        <PressableScale
          style={styles.accountHeader}
          onPress={() => setAccountExpanded((prev) => !prev)}
        >
          <Text style={styles.accountSectionLabel}>ACCOUNT</Text>
          <Text style={styles.accountChevron}>
            {accountExpanded ? '⌃' : '⌄'}
          </Text>
        </PressableScale>
        <View style={styles.sectionRule} />

        {accountExpanded ? (
          <View style={styles.listBlock}>
            <PressableScale style={styles.listRow} onPress={handleEmailPress}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{displayEmail}</Text>
              <Text style={styles.chevron}>›</Text>
            </PressableScale>
            <View style={styles.rowDivider} />
            <PressableScale
              style={styles.signOutRow}
              onPress={handleSignOut}
              disabled={signingOut}
            >
              <Text style={styles.signOutText}>
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </Text>
            </PressableScale>
          </View>
        ) : null}
      </FadeInView>

      <ProfileBodyEditSheet
        visible={bodyEditField != null}
        field={bodyEditField}
        profile={profile}
        onClose={() => setBodyEditField(null)}
        onSaved={setProfile}
      />

      <ProfileAboutEditSheet
        visible={aboutSheetVisible}
        profile={profile}
        onClose={() => setAboutSheetVisible(false)}
        onSaved={setProfile}
      />

      <ProfileMindfulEditSheet
        visible={mindfulSheetVisible}
        profile={profile}
        onClose={() => setMindfulSheetVisible(false)}
        onSaved={setProfile}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(140),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: scale(28),
  },
  headerText: {
    flex: 1,
    paddingRight: scale(12),
  },
  eyebrow: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.4),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: scale(6),
  },
  heading: {
    fontFamily: theme.fonts.header,
    fontSize: scale(32),
    letterSpacing: scale(-1),
    color: theme.colors.textPrimary,
  },
  editButton: {
    paddingTop: scale(4),
  },
  hero: {
    alignItems: 'center',
    marginBottom: scale(28),
  },
  name: {
    fontFamily: theme.fonts.header,
    fontSize: scale(22),
    letterSpacing: scale(-0.5),
    color: theme.colors.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(6),
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  mindfulCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dark,
    borderRadius: scale(4),
    paddingVertical: scale(16),
    paddingHorizontal: scale(18),
    marginBottom: scale(28),
  },
  mindfulText: {
    flex: 1,
    paddingRight: scale(12),
  },
  mindfulLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: theme.colors.grey400,
    textTransform: 'uppercase',
    marginBottom: scale(6),
  },
  mindfulSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: scale(14),
    color: theme.colors.white,
    lineHeight: scale(20),
  },
  mindfulChevron: {
    fontSize: scale(22),
    color: theme.colors.white,
    opacity: 0.7,
  },
  sectionHeader: {
    marginBottom: scale(4),
  },
  sectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: scale(10),
  },
  sectionRule: {
    borderBottomWidth: scale(0.5),
    borderBottomColor: WARM_RULE,
  },
  listBlock: {
    marginBottom: scale(28),
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
  },
  rowLabel: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: scale(14),
    color: theme.colors.textPrimary,
  },
  rowValue: {
    fontFamily: theme.fonts.body,
    fontSize: scale(14),
    color: theme.colors.textMuted,
    marginRight: scale(6),
  },
  rowSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: scale(12),
    color: theme.colors.textMuted,
    marginTop: scale(2),
  },
  preferenceText: {
    flex: 1,
    paddingRight: scale(12),
  },
  chevron: {
    fontSize: scale(20),
    color: theme.colors.textMuted,
  },
  rowDivider: {
    height: scale(0.5),
    backgroundColor: WARM_RULE,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  accountSectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  accountChevron: {
    fontSize: scale(16),
    color: theme.colors.textMuted,
  },
  signOutRow: {
    paddingVertical: scale(16),
  },
  signOutText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(14),
    color: theme.colors.red,
  },
});
