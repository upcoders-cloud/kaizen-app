import {Image, Pressable, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import TextBase from 'components/Text/Text';
import Button from 'components/Button/Button';
import ExtraImagesBadge from 'components/Badges/ExtraImagesBadge';
import ImageCarousel from 'components/PostDetail/ImageCarousel';
import {Card} from 'components/ui';
import colors from 'theme/colors';
import styles from './detailStyles';

const typeLabel = (type) => ({BEFORE: 'Przed', AFTER: 'Po'})[type] || null;

export default function PostMediaSurvey({imageItems, extraImagesCount, contentWidth, openPreview, hasSurvey, surveyHoursLabel, surveySavingsLabel, isOwner, router, resolvedId}) {
	const beforeIndex = imageItems.findIndex((item) => item.type === 'BEFORE');
	const afterIndex = imageItems.findIndex((item) => item.type === 'AFTER');
	return (
		<>
			{/* Attachments card */}
			<Card style={styles.card} padded={false}>
				<View style={styles.cardHeader}>
					<View style={styles.cardIconCircle}>
						<Feather name="image" size={14} color={colors.primary} />
					</View>
					<TextBase style={styles.cardTitle}>Załączniki</TextBase>
					{imageItems.length > 0 ? (
						<View style={styles.countBadge}>
							<TextBase style={styles.countBadgeText}>{imageItems.length}</TextBase>
						</View>
					) : null}
				</View>
				{imageItems.length === 1 ? (
					<Pressable style={styles.imageWrapper} onPress={() => openPreview(0)}>
						<Image source={{uri: imageItems[0].url}} style={styles.image} resizeMode="cover" />
						{typeLabel(imageItems[0].type) ? <View style={styles.imageTypeLabel}><TextBase style={styles.imageTypeLabelText}>{typeLabel(imageItems[0].type)}</TextBase></View> : null}
						<ExtraImagesBadge count={extraImagesCount} />
					</Pressable>
				) : imageItems.length > 1 ? (
					<View style={styles.imageWrapper}>
						<ImageCarousel
							images={imageItems}
							width={contentWidth}
							height={240}
							onImagePress={openPreview}
							showDots
						/>
						<ExtraImagesBadge count={extraImagesCount} />
					</View>
				) : (
					<TextBase style={styles.placeholderText}>Brak załączników.</TextBase>
				)}
			</Card>
			{beforeIndex >= 0 && afterIndex >= 0 ? (
				<Card style={styles.card} padded={false}>
					<TextBase style={styles.cardTitle}>Porównanie przed i po</TextBase>
					<View style={styles.comparisonRow}>
						{[{index: beforeIndex, label: 'Przed'}, {index: afterIndex, label: 'Po'}].map(({index, label}) => (
							<Pressable key={label} onPress={() => openPreview(index)} style={styles.comparisonItem} accessibilityRole="button" accessibilityLabel={`Zobacz zdjęcie: ${label.toLowerCase()}`}>
								<Image source={{uri: imageItems[index].url}} style={styles.comparisonImage} resizeMode="cover" />
								<TextBase style={styles.comparisonLabel}>{label}</TextBase>
							</Pressable>
						))}
					</View>
				</Card>
			) : null}

			{/* Survey results card */}
			{hasSurvey ? (
				<Card style={styles.surveyResultsCard} padded={false}>
					<View style={styles.cardHeader}>
						<View style={[styles.cardIconCircle, {backgroundColor: colors.successSoft}]}>
							<Feather name="bar-chart-2" size={14} color={colors.success} />
						</View>
						<TextBase style={styles.cardTitle}>Przewidywane usprawnienia</TextBase>
					</View>
					<View style={styles.surveyRow}>
						<View style={styles.surveyItem}>
							<Feather name="clock" size={18} color={colors.primary} />
							<TextBase style={styles.surveyValue}>{surveyHoursLabel} h</TextBase>
							<TextBase style={styles.surveyLabel}>Czas / miesiąc</TextBase>
						</View>
						<View style={styles.surveyDivider} />
						<View style={styles.surveyItem}>
							<Feather name="trending-up" size={18} color={colors.success} />
							<TextBase style={[styles.surveyValue, {color: colors.success}]}>
								{surveySavingsLabel} PLN
							</TextBase>
							<TextBase style={styles.surveyLabel}>Oszczędności</TextBase>
						</View>
					</View>
				</Card>
			) : isOwner ? (
				<Card style={styles.card} padded={false}>
					<View style={styles.cardHeader}>
						<View style={[styles.cardIconCircle, {backgroundColor: colors.successSoft}]}>
							<Feather name="bar-chart-2" size={14} color={colors.success} />
						</View>
						<TextBase style={styles.cardTitle}>Przewidywane usprawnienia</TextBase>
					</View>
					<TextBase style={styles.placeholderText}>
						Dodaj ankietę, aby oszacować korzyści z usprawnienia.
					</TextBase>
					<Button
						title="Uzupełnij ankietę"
						onPress={() => router.push(`/post/${resolvedId}/survey`)}
						leftIcon={<Feather name="bar-chart-2" size={14} color={colors.white} />}
						style={styles.surveyCta}
					/>
				</Card>
			) : null}
		</>
	);
}
