import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  type ProfileEditSection,
  type UserPreferences,
  type UserProfile,
} from '../lib/userProfile';
import { ProfileAvatar } from '../components/ProfileAvatar';
import {
  FadeInView,
  PressableScale,
  ProfileHeaderSkeleton,
  SkeletonBlock,
} from '../components/motion';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
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
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: theme.colors.grey200,
            true: theme.colors.dark,
          }}
          thumbColor={theme.colors.white}
          ios_backgroundColor={theme.colors.grey200}
        />
      </View>
    </>
  );
}

export default function Profile() {
  const navigation = useNavigation<NavigationProp>();
  const tabTopPadding = useTabScreenTopPadding();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [motionCapture, setMotionCapture] = useState(true);
  const [instructorVoice, setInstructorVoice] = useState(true);
  const [workoutMusic, setWorkoutMusic] = useState(true);
  const [reminders, setReminders] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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

  const openEdit = (section: ProfileEditSection) => {
    navigation.navigate('ProfileEdit', { section });
  };

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
        <Text style={styles.heading}>Your Profile.</Text>
        <PressableScale
          style={styles.editButton}
          hitSlop={8}
          onPress={() => openEdit('about')}
        >
          <Text style={styles.editIcon}>✎</Text>
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
          onPress={() => openEdit('mindful')}
        >
          <View style={styles.mindfulText}>
            <Text style={styles.mindfulLabel}>Mindful Areas</Text>
            <Text style={styles.mindfulSubtitle}>{mindfulSubtitle}</Text>
          </View>
          <Text style={styles.mindfulChevron}>›</Text>
        </PressableScale>
      </FadeInView>

      <FadeInView delay={140}>
        <SectionLabel title="BODY" />
        <View style={styles.card}>
          <BodyRow
            label="Height"
            value={formatHeight(profile)}
            onPress={() => openEdit('body')}
          />
          <BodyRow
            label="Weight"
            value={formatWeight(profile)}
            onPress={() => openEdit('body')}
            showDivider
          />
          <BodyRow
            label="Age"
            value={getAgeFromBirthday(profile?.birthday)}
            onPress={() => openEdit('body')}
            showDivider
          />
        </View>
      </FadeInView>

      <FadeInView delay={180}>
        <SectionLabel title="PREFERENCES" />
        <View style={styles.card}>
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

        {accountExpanded ? (
          <View style={styles.card}>
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
    paddingBottom: scale(120),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: scale(28),
  },
  heading: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    flex: 1,
    paddingRight: scale(12),
  },
  editButton: {
    paddingTop: scale(4),
  },
  editIcon: {
    fontSize: scale(22),
    color: theme.colors.red,
  },
  hero: {
    alignItems: 'center',
    marginBottom: scale(28),
  },
  name: {
    ...theme.typography.mediumHeader,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(6),
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    fontSize: scale(13),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  mindfulCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.md,
    paddingVertical: scale(16),
    paddingHorizontal: scale(18),
    marginBottom: scale(28),
  },
  mindfulText: {
    flex: 1,
    paddingRight: scale(12),
  },
  mindfulLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.grey400,
    marginBottom: scale(6),
  },
  mindfulSubtitle: {
    ...theme.typography.body,
    fontSize: scale(14),
    color: theme.colors.white,
    lineHeight: scale(20),
  },
  mindfulChevron: {
    fontSize: scale(22),
    color: theme.colors.white,
    opacity: 0.7,
  },
  sectionLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textSecondary,
    marginBottom: scale(10),
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    marginBottom: scale(24),
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
  },
  rowLabel: {
    flex: 1,
    ...theme.typography.body,
    fontSize: scale(15),
    color: theme.colors.textPrimary,
  },
  rowValue: {
    ...theme.typography.body,
    fontSize: scale(14),
    color: theme.colors.textSecondary,
    marginRight: scale(6),
  },
  rowSubtitle: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: theme.colors.textSecondary,
    marginTop: scale(2),
  },
  preferenceText: {
    flex: 1,
    paddingRight: scale(12),
  },
  chevron: {
    fontSize: scale(20),
    color: theme.colors.textSecondary,
  },
  rowDivider: {
    height: scale(1),
    backgroundColor: theme.colors.border,
    marginLeft: scale(16),
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  accountSectionLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textSecondary,
  },
  accountChevron: {
    fontSize: scale(16),
    color: theme.colors.textSecondary,
  },
  signOutRow: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
  },
  signOutText: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(15),
    color: theme.colors.red,
  },
});
