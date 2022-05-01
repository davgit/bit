import { RemoteLaneId } from '@teambit/lane-id';
import { Consumer } from '..';
import { BitIds } from '../../bit-id';
import loader from '../../cli/loader';
import { BEFORE_LOADING_COMPONENTS } from '../../cli/loader/loader-messages';
import { Lane } from '../../scope/models';
import WorkspaceLane from '../bit-map/workspace-lane';
import ComponentsList from '../component/components-list';

export async function updateLanesAfterExport(consumer: Consumer, lane: Lane) {
  // lanes that don't have remoteLaneId should not be updated. it happens when updating to a
  // different remote with no intention to save the remote.
  if (!lane.remoteLaneId) return;
  const currentLane = consumer.getCurrentLaneId();
  const isCurrentLane = lane.name === currentLane.name;
  if (!isCurrentLane) {
    throw new Error(
      `updateLanesAfterExport should get called only with current lane, got ${lane.name}, current ${currentLane.name}`
    );
  }
  const workspaceLanesToUpdate: WorkspaceLane[] = [];
  const remoteLaneId = lane.remoteLaneId as RemoteLaneId;
  consumer.bitMap.setRemoteLane(remoteLaneId);
  const workspaceLane = consumer.bitMap.workspaceLane as WorkspaceLane; // bitMap.workspaceLane is empty only when is on main
  consumer.bitMap.updateLanesProperty(workspaceLane, remoteLaneId);
  workspaceLane.reset();
  await Promise.all(workspaceLanesToUpdate.map((l) => l.write()));
}

export async function getLaneCompIdsToExport(
  consumer: Consumer,
  includeNonStaged: boolean
): Promise<{ componentsToExport: BitIds; laneObject: Lane }> {
  const currentLaneId = consumer.getCurrentLaneId();
  const laneObject = await consumer.scope.loadLane(currentLaneId);
  if (!laneObject) {
    throw new Error(`fatal: unable to load the current lane object (${currentLaneId.toString()})`);
  }
  loader.start(BEFORE_LOADING_COMPONENTS);
  const componentsList = new ComponentsList(consumer);
  const componentsToExport = includeNonStaged
    ? await componentsList.listNonNewComponentsIds()
    : await componentsList.listExportPendingComponentsIds(laneObject);
  return { componentsToExport, laneObject };
}

export function isUserTryingToExportLanes(consumer: Consumer) {
  const currentLaneId = consumer.getCurrentLaneId();
  return !currentLaneId.isDefault();
}

// leave this here in case we do want to guess whether a user wants to export a lane.
// export async function isUserTryingToExportLanes(consumer: Consumer) {
//   const getLaneNames = async (): Promise<string[]> => {
//     const lanesObj = await consumer.scope.listLanes();
//     const laneNames = lanesObj.map(lane => lane.name);
//     laneNames.push(DEFAULT_LANE);
//     return laneNames;
//   };
//   const laneNames = await getLaneNames();
//   const idsFromWorkspaceAndScope = await componentsList.listAllIdsFromWorkspaceAndScope();
//   const currentLaneId = consumer.getCurrentLaneId();
//   if (lanes) return true;
//   if (!ids.length) {
//     // if no ids entered, when a user checked out to a lane, we should export the lane
//     return !currentLaneId.isDefault();
//   }
//   if (ids.every(id => !laneNames.includes(id))) {
//     // if none of the ids is lane, then user is not trying to export lanes
//     return false;
//   }
//   // some or all ids are lane names, if all are not ids, user is trying to export lanes
//   return ids.every(id => {
//     if (laneNames.includes(id) && idsFromWorkspaceAndScope.hasWithoutScopeAndVersionAsString(id)) {
//       throw new GeneralError(`the id ${id} is both, a component-name and a lane-name`);
//     }
//     return laneNames.includes(id);
//   });
// };
