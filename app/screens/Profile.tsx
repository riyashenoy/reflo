import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
  getProfileInitial,
  saveUserProfile,
  type ProfileEditSection,
  type UserPreferences,
  type UserProfile,
} from '../lib/userProfile';
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
      <Pressable style={styles.listRow} onPress={onPress}>
        <View style={styles.greyIcon} />
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
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
        <View style={styles.tealIcon} />
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
  const avatarInitial = getProfileInitial(
    profile?.name,
    auth.currentUser?.email
  );
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.red} />
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
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            </View>
            <Pressable
              style={styles.avatarEditBadge}
              onPress={() => openEdit('about')}
              hitSlop={6}
            >
              <Text style={styles.avatarEditIcon}>✎</Text>
            </Pressable>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.subtitle}>{profileSubtitle}</Text>
          </View>
        </View>
        <Pressable onPress={() => openEdit('about')} hitSlop={8}>
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.mindfulCard}
        onPress={() => openEdit('mindful')}
      >
        <Text style={styles.warningIcon}>⚠</Text>
        <View style={styles.mindfulText}>
          <Text style={styles.mindfulTitle}>Mindful Areas</Text>
          <Text style={styles.mindfulSubtitle}>{mindfulSubtitle}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

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

      <View style={styles.sectionDivider} />
      <Pressable
        style={styles.accountHeader}
        onPress={() => setAccountExpanded((prev) => !prev)}
      >
        <Text style={styles.accountSectionLabel}>ACCOUNT SETTINGS</Text>
        <Text style={styles.accountChevron}>
          {accountExpanded ? '⌃' : '⌄'}
        </Text>
      </Pressable>

      {accountExpanded ? (
        <View style={styles.card}>
          <Pressable style={styles.listRow} onPress={handleEmailPress}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{displayEmail}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={styles.signOutRow}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            <Text style={styles.signOutText}>
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: scale(24),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: scale(14),
  },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: theme.colors.white,
    borderWidth: scale(2),
    borderColor: theme.colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: scale(-2),
    bottom: scale(-2),
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: theme.colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(2),
    borderColor: theme.colors.background,
  },
  avatarEditIcon: {
    color: theme.colors.white,
    fontSize: scale(12),
  },
  avatarInitial: {
    fontFamily: theme.fonts.headerMedium,
    fontSize: scale(36),
    color: theme.colors.red,
  },
  headerText: {
    flex: 1,
    paddingRight: scale(8),
  },
  name: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(18),
    color: theme.colors.textPrimary,
    marginBottom: scale(4),
  },
  subtitle: {
    ...theme.typography.body,
    fontSize: scale(13),
    color: theme.colors.textSecondary,
  },
  editLink: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(15),
    color: theme.colors.red,
  },
  mindfulCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.mindfulBg,
    borderWidth: scale(1),
    borderColor: theme.colors.amber,
    borderRadius: theme.radius.md,
    padding: scale(16),
    marginBottom: scale(24),
  },
  warningIcon: {
    fontSize: scale(22),
    color: theme.colors.amber,
    marginRight: scale(12),
  },
  mindfulText: {
    flex: 1,
  },
  mindfulTitle: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(15),
    color: theme.colors.textPrimary,
    marginBottom: scale(2),
  },
  mindfulSubtitle: {
    ...theme.typography.body,
    fontSize: scale(13),
    color: theme.colors.textSecondary,
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
  greyIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.grey200,
    marginRight: scale(14),
  },
  tealIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: theme.radius.sm,
    backgroundColor: `${theme.colors.teal}40`,
    marginRight: scale(14),
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
    paddingRight: scale(8),
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
  sectionDivider: {
    height: scale(1),
    backgroundColor: theme.colors.border,
    marginBottom: scale(16),
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(8),
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
